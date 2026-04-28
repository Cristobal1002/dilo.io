import { createHmac } from 'node:crypto'
import { generateObject } from 'ai'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  answers,
  flows,
  results,
  sessions,
  stepOptions,
  steps,
  webhookDeliveries,
  webhooks,
} from '@/db/schema'
import { getStructuredOutputModel } from '@/lib/ai-model'
import { createLogger } from '@/lib/logger'
import { notifyOrgUsersInstantLeadAlerts } from '@/lib/notifications/instant-lead-alerts'
import { formatFileAnswerForBubble, isFilePayload } from '@/lib/public-flow-file-helpers'
import { formatMultiAnswerForDisplay, formatSelectAnswerForDisplay } from '@/lib/step-choice-helpers'

const log = createLogger('session-completion')

/** Sin `z.record`: OpenAI json_schema estricto no admite `propertyNames` que genera record(). */
const SessionAnalysisSchema = z.object({
  summary: z.string(),
  classification: z.enum(['hot', 'warm', 'cold']),
  /** Sin .min/.max: Anthropic structured outputs no admite minimum/maximum en integer. */
  score: z.number().nullable(),
  suggested_action: z.string().nullable(),
})

function normalizeAnalysisScore(score: number | null): number | null {
  if (score === null || Number.isNaN(score)) return null
  return Math.max(0, Math.min(100, Math.round(score)))
}

type StepRow = {
  id: string
  type: string
  question: string
  variableName: string
  options: { label: string; value: string }[]
}

function parseScoringCriteria(raw: unknown): {
  hot: string
  warm: string
  cold: string
  objective: string | null
} {
  const defaults = {
    hot: 'Respuesta muy alineada con el objetivo del flow, perfil completo y señales claras de avanzar.',
    warm: 'Alineación parcial con el objetivo o información incompleta que requiere seguimiento.',
    cold: 'Bajo encaje con el objetivo del flow o respuestas insuficientes para evaluar.',
    objective: null,
  }
  if (!raw || typeof raw !== 'object') return defaults
  const o = raw as Record<string, unknown>
  return {
    hot: typeof o.hot === 'string' && o.hot.trim() ? o.hot.trim() : defaults.hot,
    warm: typeof o.warm === 'string' && o.warm.trim() ? o.warm.trim() : defaults.warm,
    cold: typeof o.cold === 'string' && o.cold.trim() ? o.cold.trim() : defaults.cold,
    objective: typeof o.objective === 'string' && o.objective.trim() ? o.objective.trim() : null,
  }
}

function displayAnswer(step: StepRow, raw: string | null): string {
  if (raw == null || raw === '') return '(sin respuesta)'
  if (step.type === 'file') {
    try {
      const p = JSON.parse(raw) as unknown
      if (isFilePayload(p)) return formatFileAnswerForBubble(p)
    } catch {
      /* ignore */
    }
    return raw
  }
  if (step.type === 'multi_select') {
    return formatMultiAnswerForDisplay(raw, step.options)
  }
  if (step.type === 'select') {
    return formatSelectAnswerForDisplay(raw, step.options)
  }
  if (step.type === 'yes_no') {
    if (raw === 'yes') return 'Sí'
    if (raw === 'no') return 'No'
    return raw
  }
  return raw
}

async function loadStepsForFlow(flowId: string): Promise<StepRow[]> {
  const flowSteps = await db.query.steps.findMany({
    where: eq(steps.flowId, flowId),
    orderBy: asc(steps.order),
  })
  return Promise.all(
    flowSteps.map(async (step) => {
      const options = await db.query.stepOptions.findMany({
        where: eq(stepOptions.stepId, step.id),
        orderBy: asc(stepOptions.order),
      })
      return {
        id: step.id,
        type: step.type,
        question: step.question,
        variableName: step.variableName,
        options: options.map((o) => ({ label: o.label, value: o.value })),
      }
    }),
  )
}

function buildTranscript(stepRows: StepRow[], answerByStep: Record<string, string | null>): string {
  const lines: string[] = []
  for (const s of stepRows) {
    const v = answerByStep[s.id] ?? null
    lines.push(`Pregunta (${s.variableName}): ${s.question}`)
    lines.push(`Respuesta: ${displayAnswer(s, v)}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

function buildStructuredFromSteps(stepRows: StepRow[], answerByStep: Record<string, string | null>) {
  const out: Record<string, string> = {}
  for (const s of stepRows) {
    out[s.variableName] = displayAnswer(s, answerByStep[s.id] ?? null)
  }
  return out
}

function extractLeadContact(
  stepRows: StepRow[],
  answerByStep: Record<string, string | null>,
): { name?: string; email?: string; phone?: string } {
  const out: { name?: string; email?: string; phone?: string } = {}
  for (const s of stepRows) {
    const v = answerByStep[s.id]
    if (v == null || v === '') continue
    if (s.type === 'email' && !out.email) out.email = displayAnswer(s, v)
    if (s.type === 'phone' && !out.phone) out.phone = displayAnswer(s, v)
    if (s.type === 'text' && /name|nombre|full/i.test(s.variableName) && !out.name) {
      out.name = displayAnswer(s, v)
    }
  }
  if (!out.name) {
    const firstText = stepRows.find((s) => s.type === 'text' && answerByStep[s.id])
    if (firstText) {
      const v = answerByStep[firstText.id]
      if (v) out.name = displayAnswer(firstText, v)
    }
  }
  return out
}

async function deliverOneWebhook(args: {
  webhookId: string
  url: string
  secret: string | null
  sessionId: string
  flowId: string
  payload: Record<string, unknown>
}) {
  const body = JSON.stringify(args.payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Dilo-Webhook/1.0',
  }
  if (args.secret) {
    const sig = createHmac('sha256', args.secret).update(body).digest('hex')
    headers['X-Dilo-Signature'] = `sha256=${sig}`
  }

  let httpStatus: number | null = null
  let ok = false
  try {
    const res = await fetch(args.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(20_000),
    })
    httpStatus = res.status
    ok = res.ok
  } catch (e) {
    log.warn({ err: e, webhookId: args.webhookId, url: args.url }, 'Webhook delivery fetch failed')
  }

  await db.insert(webhookDeliveries).values({
    webhookId: args.webhookId,
    sessionId: args.sessionId,
    status: ok ? 'success' : 'failed',
    httpStatus,
    attempts: 1,
  })
}

export type ProcessSessionCompletionOptions = {
  /**
   * Borra el `results` actual y vuelve a ejecutar el análisis con IA.
   * No reenvía webhooks ni alertas instantáneas (evita duplicados al corregir fallos del modelo).
   */
  replaceExisting?: boolean
}

/**
 * Tras la primera transición a sesión completada: análisis con IA, fila en `results`,
 * y envío de webhooks activos del flow (cada intento queda en `webhook_deliveries`).
 * Idempotente si ya existe `results` para la sesión, salvo que pases `replaceExisting: true`.
 */
export async function processSessionCompletion(
  sessionId: string,
  opts?: ProcessSessionCompletionOptions,
): Promise<void> {
  const replace = opts?.replaceExisting === true

  if (replace) {
    await db.delete(results).where(eq(results.sessionId, sessionId))
  } else {
    const existing = await db.query.results.findFirst({
      where: eq(results.sessionId, sessionId),
    })
    if (existing) {
      log.debug({ sessionId }, 'Session completion skipped: result already exists')
      return
    }
  }

  const sessionRow = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })
  if (!sessionRow || sessionRow.status !== 'completed') {
    log.warn({ sessionId }, 'Session completion skipped: session missing or not completed')
    return
  }

  const flowRow = await db.query.flows.findFirst({
    where: eq(flows.id, sessionRow.flowId),
  })
  if (!flowRow) {
    log.error({ sessionId, flowId: sessionRow.flowId }, 'Flow not found for session')
    return
  }

  const stepRows = await loadStepsForFlow(flowRow.id)
  const answerRows = await db.query.answers.findMany({
    where: eq(answers.sessionId, sessionId),
  })
  const answerByStep: Record<string, string | null> = {}
  for (const a of answerRows) {
    answerByStep[a.stepId] = a.value ?? null
  }

  const transcript = buildTranscript(stepRows, answerByStep)
  const criteria = parseScoringCriteria(flowRow.scoringCriteria)

  let analysis: z.infer<typeof SessionAnalysisSchema> | null = null
  try {
    const { object } = await generateObject({
      model: getStructuredOutputModel(),
      schema: SessionAnalysisSchema,
      system: [
        'Eres un analista que evalúa respuestas de formularios conversacionales.',
        'Devuelve SIEMPRE JSON válido con el schema: resumen en español, clasificación hot|warm|cold, score 0-100 o null, suggested_action breve o null.',
        '',
        criteria.objective
          ? `Objetivo de evaluación definido por el creador del flow: "${criteria.objective}"`
          : 'Evalúa qué tan bien las respuestas cumplen el propósito del flow.',
        '',
        'Criterios de clasificación específicos para este flow:',
        `- HOT: ${criteria.hot}`,
        `- WARM: ${criteria.warm}`,
        `- COLD: ${criteria.cold}`,
        '',
        'El resumen debe ser concreto y en español. El suggested_action es el siguiente paso recomendado según el objetivo del flow.',
        'No inventes datos que no aparezcan en el transcript. No uses lenguaje de ventas si el flow no es de ventas.',
      ].join('\n'),
      prompt: [
        `Flow: "${flowRow.name}"`,
        flowRow.description ? `Descripción del flow: ${flowRow.description}` : '',
        criteria.objective ? `Lo que se quiere medir: ${criteria.objective}` : '',
        '',
        'Transcript de respuestas:',
        transcript || '(vacío)',
      ]
        .filter(Boolean)
        .join('\n'),
    })
    analysis = {
      ...object,
      score: normalizeAnalysisScore(object.score),
    }
  } catch (e) {
    log.error({ err: e, sessionId }, 'GPT session analysis failed; storing fallback result')
  }

  const fallbackStructured = buildStructuredFromSteps(stepRows, answerByStep)

  if (analysis) {
    await db.insert(results).values({
      sessionId,
      summary: analysis.summary,
      score: analysis.score ?? null,
      classification: analysis.classification,
      suggestedAction: analysis.suggested_action ?? null,
      structuredData: fallbackStructured,
    })
  } else {
    await db.insert(results).values({
      sessionId,
      summary: 'No se pudo generar el resumen automático. Revisa las respuestas en el panel.',
      score: null,
      classification: 'cold',
      suggestedAction: null,
      structuredData: fallbackStructured,
    })
  }

  const hooks = await db.query.webhooks.findMany({
    where: and(eq(webhooks.flowId, flowRow.id), eq(webhooks.active, true)),
  })

  const resultRow = await db.query.results.findFirst({
    where: eq(results.sessionId, sessionId),
  })

  const answersPayload = buildStructuredFromSteps(stepRows, answerByStep)
  const payload = {
    event: 'flow.session.completed',
    session_id: sessionRow.id,
    flow_id: flowRow.id,
    completed_at: sessionRow.completedAt?.toISOString() ?? new Date().toISOString(),
    answers: answersPayload,
    result: resultRow
      ? {
          summary: resultRow.summary,
          classification: resultRow.classification,
          score: resultRow.score,
          suggested_action: resultRow.suggestedAction,
          structured_data: resultRow.structuredData ?? {},
        }
      : null,
  }

  if (!replace) {
    for (const h of hooks) {
      await deliverOneWebhook({
        webhookId: h.id,
        url: h.url,
        secret: h.secret ?? null,
        sessionId: sessionRow.id,
        flowId: flowRow.id,
        payload,
      })
    }
  } else {
    log.info({ sessionId, flowId: flowRow.id }, 'Session analysis recalculated: webhooks skipped')
  }

  if (resultRow && !replace) {
    const contact = extractLeadContact(stepRows, answerByStep)
    void notifyOrgUsersInstantLeadAlerts({
      organizationId: flowRow.organizationId,
      flowName: flowRow.name,
      flowId: flowRow.id,
      sessionId: sessionRow.id,
      summary: resultRow.summary,
      score: resultRow.score,
      classification: resultRow.classification,
      suggestedAction: resultRow.suggestedAction,
      contact,
    }).catch((err) => {
      log.error({ err, sessionId: sessionRow.id }, 'notifyOrgUsersInstantLeadAlerts failed')
    })
  }

  log.info(
    { sessionId, flowId: flowRow.id, webhooks: replace ? 0 : hooks.length, replace },
    'Session completion processed',
  )
}
