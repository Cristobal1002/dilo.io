import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { answers, flows, results, sessions, stepOptions, steps } from '@/db/schema'
import { formatFlowAnswerDisplay } from '@/lib/format-flow-answer'

export type SessionQuoteContext = {
  flowId: string
  flowName: string
  sessionId: string
  summary: string | null
  contact: Record<string, string | null>
  qaBlocks: { variable: string; question: string; answer: string }[]
}

function normalizeContact(raw: unknown): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v == null) out[k] = null
    else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v)
    }
  }
  return out
}

export async function loadSessionQuoteContext(
  organizationId: string,
  flowId: string,
  sessionId: string,
): Promise<SessionQuoteContext | null> {
  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, organizationId)),
    columns: { id: true, name: true },
  })
  if (!flow) return null

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.flowId, flowId)),
    columns: { id: true, contact: true, status: true },
  })
  if (!session || session.status !== 'completed') return null

  const result = await db.query.results.findFirst({
    where: eq(results.sessionId, sessionId),
    columns: { summary: true },
  })

  const stepRows = await db.query.steps.findMany({
    where: eq(steps.flowId, flowId),
    orderBy: asc(steps.order),
  })

  const stepIds = stepRows.map((s) => s.id)
  const answerRows =
    stepIds.length > 0
      ? await db
          .select({ stepId: answers.stepId, value: answers.value })
          .from(answers)
          .where(and(eq(answers.sessionId, sessionId), inArray(answers.stepId, stepIds)))
      : []

  const answerByStep = new Map(answerRows.map((a) => [a.stepId, a.value ?? null]))

  const qaBlocks: SessionQuoteContext['qaBlocks'] = []
  for (const step of stepRows) {
    if (step.type === 'file') continue
    const opts = await db.query.stepOptions.findMany({
      where: eq(stepOptions.stepId, step.id),
      orderBy: asc(stepOptions.order),
      columns: { label: true, value: true },
    })
    const raw = answerByStep.get(step.id) ?? null
    const display = formatFlowAnswerDisplay(
      step.type,
      raw,
      opts.map((o) => ({ label: o.label, value: o.value })),
    )
    if (display === '—') continue
    qaBlocks.push({
      variable: step.variableName,
      question: step.question,
      answer: display,
    })
  }

  return {
    flowId,
    flowName: flow.name,
    sessionId,
    summary: result?.summary ?? null,
    contact: normalizeContact(session.contact),
    qaBlocks,
  }
}

export function sessionContextToPromptText(ctx: SessionQuoteContext): string {
  const contactLines = Object.entries(ctx.contact)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const qa = ctx.qaBlocks.map((b) => `[${b.variable}] ${b.question}\n→ ${b.answer}`).join('\n\n')

  return [
    `Flow: ${ctx.flowName}`,
    ctx.summary ? `Resumen IA de la sesión:\n${ctx.summary}` : '',
    contactLines ? `Contacto capturado:\n${contactLines}` : '',
    'Respuestas:',
    qa || '(sin respuestas de texto)',
  ]
    .filter(Boolean)
    .join('\n\n')
}
