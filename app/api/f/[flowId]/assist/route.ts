import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clients, flows, sessions } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { runDeflectionAssist } from '@/lib/deflection-assist'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { loadPublishedFlowWithSteps } from '@/lib/load-published-flow'
import { readSessionEmbedContext } from '@/lib/embed-context'
import { shouldDeflectBeforeForm } from '@/lib/support-mode'
import { withApiHandler } from '@/lib/with-api-handler'

const BodySchema = z.object({
  sessionToken: z.string().min(1).max(200),
  query: z.string().trim().min(3).max(2000),
})

export const maxDuration = 30

export const POST = withApiHandler(
  async (req: NextRequest, { params }) => {
    const flowId = params.flowId
    if (!z.string().uuid().safeParse(flowId).success) {
      throw new NotFoundError('Flow')
    }

    let json: unknown
    try {
      json = await req.json()
    } catch {
      throw new ValidationError('JSON inválido')
    }

    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten())
    }

    const { flow, steps: _steps } = await loadPublishedFlowWithSteps(flowId)
    if (!shouldDeflectBeforeForm(flow.settings)) {
      throw new ValidationError('Este flow no tiene deflexión activa')
    }

    const sessionRow = await db.query.sessions.findFirst({
      where: and(eq(sessions.flowId, flowId), eq(sessions.token, parsed.data.sessionToken)),
    })
    if (!sessionRow || sessionRow.status !== 'in_progress') {
      throw new NotFoundError('Sesión')
    }

    const flowRow = await db.query.flows.findFirst({
      where: eq(flows.id, flowId),
      columns: { organizationId: true },
    })
    if (!flowRow) {
      throw new NotFoundError('Flow')
    }

    const embedCtx = readSessionEmbedContext(sessionRow.metadata)
    const clientId = embedCtx?.clientId ?? null

    if (clientId) {
      const clientRow = await db.query.clients.findFirst({
        where: and(eq(clients.id, clientId), eq(clients.organizationId, flowRow.organizationId)),
        columns: { id: true },
      })
      if (!clientRow) {
        throw new ValidationError('Cliente de sesión inválido')
      }
    }

    const result = await runDeflectionAssist({
      organizationId: flowRow.organizationId,
      query: parsed.data.query,
      clientId,
      flowName: flow.name,
    })

    return apiSuccess({
      answer: result.answer,
      sources: result.articleTitles,
    })
  },
  { requireAuth: false },
)
