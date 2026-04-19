import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { answers, sessions } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiNoContent, apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import {
  DISCOVERY_STUB_FLOW_SEGMENT,
  DiscoverySessionPutBodySchema,
} from '@/lib/discovery-stub'
import { loadPublishedFlowWithSteps } from '@/lib/load-published-flow'

const log = createLogger('api/f/[flowId]/sessions/[token]')

const MAX_PUT_BYTES = 512_000
const flowIdSchema = z.string().uuid()

function isDiscoveryStubFlow(flowId: string): boolean {
  return flowId === DISCOVERY_STUB_FLOW_SEGMENT
}

function serializeAnswerValue(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  try {
    return JSON.stringify(raw)
  } catch {
    return String(raw)
  }
}

export const GET = withApiHandler(
  async (_req: NextRequest, { params }) => {
    const { flowId, token } = params
    if (isDiscoveryStubFlow(flowId)) {
      throw new NotFoundError('Sesión')
    }
    if (!flowIdSchema.safeParse(flowId).success || !token || token.length > 200) {
      throw new NotFoundError('Sesión')
    }

    await loadPublishedFlowWithSteps(flowId)

    const sessionRow = await db.query.sessions.findFirst({
      where: and(eq(sessions.flowId, flowId), eq(sessions.token, token)),
    })
    if (!sessionRow) {
      throw new NotFoundError('Sesión')
    }

    const rows = await db.query.answers.findMany({
      where: eq(answers.sessionId, sessionRow.id),
    })
    const answerMap: Record<string, string | null> = {}
    for (const a of rows) {
      answerMap[a.stepId] = a.value ?? null
    }

    return apiSuccess({
      session: {
        id: sessionRow.id,
        status: sessionRow.status,
        metadata: sessionRow.metadata ?? {},
        completedAt: sessionRow.completedAt,
      },
      answers: answerMap,
    })
  },
  { requireAuth: false },
)

export const PUT = withApiHandler(
  async (req: NextRequest, { params }) => {
    const { flowId, token } = params

    if (isDiscoveryStubFlow(flowId)) {
      if (!token || token.length > 200) {
        throw new ValidationError('Token de sesión inválido')
      }

      const len = req.headers.get('content-length')
      if (len && Number(len) > MAX_PUT_BYTES) {
        throw new ValidationError('Cuerpo demasiado grande')
      }

      let json: unknown
      try {
        json = await req.json()
      } catch {
        throw new ValidationError('JSON inválido')
      }

      const parsed = DiscoverySessionPutBodySchema.safeParse(json)
      if (!parsed.success) {
        throw new ValidationError('Datos de sesión inválidos', parsed.error.flatten())
      }

      log.debug(
        {
          stub: 'discovery',
          tokenPrefix: token.slice(0, 8),
          keys: Object.keys(parsed.data.answers ?? {}),
          currentStepIndex: parsed.data.currentStepIndex,
          completed: parsed.data.completed,
        },
        'Discovery session PUT accepted (no persistence)',
      )

      return apiNoContent()
    }

    if (!flowIdSchema.safeParse(flowId).success || !token || token.length > 200) {
      throw new ValidationError('Token de sesión inválido')
    }

    const len = req.headers.get('content-length')
    if (len && Number(len) > MAX_PUT_BYTES) {
      throw new ValidationError('Cuerpo demasiado grande')
    }

    let json: unknown
    try {
      json = await req.json()
    } catch {
      throw new ValidationError('JSON inválido')
    }

    const parsed = DiscoverySessionPutBodySchema.safeParse(json)
    if (!parsed.success) {
      throw new ValidationError('Datos de sesión inválidos', parsed.error.flatten())
    }

    const { steps } = await loadPublishedFlowWithSteps(flowId)
    const stepIds = new Set(steps.map((s) => s.id))

    const sessionRow = await db.query.sessions.findFirst({
      where: and(eq(sessions.flowId, flowId), eq(sessions.token, token)),
    })
    if (!sessionRow) {
      throw new NotFoundError('Sesión')
    }

    const bodyAnswers = parsed.data.answers ?? {}
    for (const stepId of Object.keys(bodyAnswers)) {
      if (!stepIds.has(stepId)) {
        throw new ValidationError('Respuesta asociada a un paso inválido', { stepId })
      }
    }

    for (const [stepId, raw] of Object.entries(bodyAnswers)) {
      const value = serializeAnswerValue(raw)
      await db
        .insert(answers)
        .values({
          sessionId: sessionRow.id,
          stepId,
          value,
        })
        .onConflictDoUpdate({
          target: [answers.sessionId, answers.stepId],
          set: { value, updatedAt: new Date() },
        })
    }

    const prevMeta =
      typeof sessionRow.metadata === 'object' && sessionRow.metadata !== null
        ? { ...(sessionRow.metadata as Record<string, unknown>) }
        : {}

    if (parsed.data.currentStepIndex !== undefined) {
      prevMeta.currentStepIndex = parsed.data.currentStepIndex
    }

    const now = new Date()
    const completed = parsed.data.completed === true

    await db
      .update(sessions)
      .set({
        metadata: prevMeta,
        updatedAt: now,
        ...(completed
          ? {
              status: 'completed',
              completedAt: sessionRow.completedAt ?? now,
            }
          : {}),
      })
      .where(eq(sessions.id, sessionRow.id))

    log.debug(
      {
        flowId,
        tokenPrefix: token.slice(0, 8),
        answerKeys: Object.keys(bodyAnswers).length,
        currentStepIndex: parsed.data.currentStepIndex,
        completed,
      },
      'Public session PUT persisted',
    )

    return apiNoContent()
  },
  { requireAuth: false },
)
