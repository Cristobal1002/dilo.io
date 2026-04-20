import { createHmac } from 'node:crypto'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
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
import { createLogger } from '@/lib/logger'
import { formatFileAnswerForBubble, isFilePayload } from '@/lib/public-flow-file-helpers'

const log = createLogger('session-completion')

/** Sin `z.record`: OpenAI json_schema estricto no admite `propertyNames` que genera record(). */
const SessionAnalysisSchema = z.object({
  summary: z.string(),
  classification: z.enum(['hot', 'warm', 'cold']),
  score: z.number().int().min(0).max(100).nullable(),
  suggested_action: z.string().nullable(),
})

type StepRow = {
  id: string
  type: string
  question: string
  variableName: string
  options: { label: string; value: string }[]
}

function parseScoringCriteria(raw: unknown): { hot: string; warm: string; cold: string } {
  const defaults = {
    hot: 'Lead muy alineado con el objetivo del flow o con intención clara de avanzar.',
    warm: 'Interés moderado, perfil parcialmente alineado o necesita seguimiento.',
    cold: 'Bajo encaje, poca señal de intención o respuestas insuficientes.',
  }
  if (!raw || typeof raw !== 'object') return defaults
  const o = raw as Record<string, unknown>
  return {
    hot: typeof o.hot === 'string' && o.hot.trim() ? o.hot.trim() : defaults.hot,
    warm: typeof o.warm === 'string' && o.warm.trim() ? o.warm.trim() : defaults.warm,
    cold: typeof o.cold === 'string' && o.cold.trim() ? o.cold.trim() : defaults.cold,
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
    try {
      const arr = JSON.parse(raw) as unknown
      if (!Array.isArray(arr)) return raw
      return arr
        .map((val) => step.options.find((o) => o.value === String(val))?.label ?? String(val))
        .join(', ')
    } catch {
      return raw
    }
  }
  if (step.type === 'select') {
    return step.options.find((o) => o.value === raw)?.label ?? raw
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

/**
 * Tras la primera transición a sesión completada: análisis con GPT-4o, fila en `results`,
 * y envío de webhooks activos del flow (cada intento queda en `webhook_deliveries`).
 * Idempotente si ya existe `results` para la sesión.
 */
export async function processSessionCompletion(sessionId: string): Promise<void> {
  const existing = await db.query.results.findFirst({
    where: eq(results.sessionId, sessionId),
  })
  if (existing) {
    log.debug({ sessionId }, 'Session completion skipped: result already exists')
    return
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
      model: openai('gpt-4o'),
      schema: SessionAnalysisSchema,
      system: [
        'Eres un analista que resume conversaciones de captación (forms conversacionales).',
        'Debes devolver SIEMPRE JSON que cumpla el schema: resumen en español, clasificación hot|warm|cold, score 0-100 o null, suggested_action breve o null (siguiente paso sugerido para el equipo comercial).',
        'Usa las definiciones de scoring del flow para decidir hot/warm/cold:',
        `- HOT: ${criteria.hot}`,
        `- WARM: ${criteria.warm}`,
        `- COLD: ${criteria.cold}`,
        'Sé concreto y profesional. No inventes datos que no aparezcan en el transcript.',
      ].join('\n'),
      prompt: [
        `Flow: "${flowRow.name}"`,
        flowRow.description ? `Descripción del flow: ${flowRow.description}` : '',
        '',
        'Transcript de respuestas:',
        transcript || '(vacío)',
      ]
        .filter(Boolean)
        .join('\n'),
    })
    analysis = object
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

  log.info({ sessionId, flowId: flowRow.id, webhooks: hooks.length }, 'Session completion processed')
}
