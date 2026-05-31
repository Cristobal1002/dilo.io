import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { answers, flows, results, sessions, stepOptions, steps, supportCases } from '@/db/schema'
import { createLogger } from '@/lib/logger'
import { isSupportFlow } from '@/lib/support-flow-purpose'
import { createSupportCaseFromSession } from '@/lib/support-case-from-session'
import { ensureClientByName, getClientNameById, isUuidLike } from '@/lib/support-clients'
import {
  buildStructuredFromSteps,
  buildStructuredRawFromSteps,
  type SupportStepRow,
} from '@/lib/support-session-structured'
import { mapSupportPriorityFromAnswer, mapSupportTypeFromAnswer } from '@/lib/support'

const log = createLogger('support-case-sync')

async function loadStepsForFlow(flowId: string): Promise<SupportStepRow[]> {
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

async function loadAnswerMap(sessionId: string, stepIds: string[]) {
  if (stepIds.length === 0) return {}
  const rows = await db
    .select({ stepId: answers.stepId, value: answers.value })
    .from(answers)
    .where(and(eq(answers.sessionId, sessionId), inArray(answers.stepId, stepIds)))
  const out: Record<string, string | null> = {}
  for (const r of rows) out[r.stepId] = r.value ?? null
  return out
}

function pickAnswer(structured: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    const v = structured[k]?.trim()
    if (v && v !== '(sin respuesta)') return v
  }
  return null
}

export type SupportCaseSyncResult = {
  created: number
  typesUpdated: number
  skipped: number
}

/**
 * Crea casos faltantes para sesiones completadas de flows con purpose=support
 * y corrige tipo/prioridad en casos existentes según respuestas guardadas.
 */
export async function syncSupportCasesForOrganization(
  organizationId: string,
): Promise<SupportCaseSyncResult> {
  let created = 0
  let typesUpdated = 0
  let skipped = 0

  const flowRows = await db.query.flows.findMany({
    where: eq(flows.organizationId, organizationId),
    columns: { id: true, name: true, settings: true },
  })

  const supportFlows = flowRows.filter((f) => isSupportFlow(f.settings))
  if (supportFlows.length === 0) {
    return { created: 0, typesUpdated: 0, skipped: 0 }
  }

  const supportFlowIds = supportFlows.map((f) => f.id)
  const flowById = new Map(supportFlows.map((f) => [f.id, f]))

  const completedSessions = await db.query.sessions.findMany({
    where: and(eq(sessions.status, 'completed'), inArray(sessions.flowId, supportFlowIds)),
    columns: { id: true, flowId: true, contact: true, metadata: true },
  })

  const existingCases = await db.query.supportCases.findMany({
    where: eq(supportCases.organizationId, organizationId),
    columns: { id: true, sessionId: true, type: true, priority: true, clientCompany: true, clientId: true },
  })
  const caseBySession = new Map(
    existingCases.filter((c) => c.sessionId).map((c) => [c.sessionId!, c]),
  )

  const stepsByFlow = new Map<string, SupportStepRow[]>()
  for (const flowId of supportFlowIds) {
    stepsByFlow.set(flowId, await loadStepsForFlow(flowId))
  }

  for (const session of completedSessions) {
    const flow = flowById.get(session.flowId)
    if (!flow) {
      skipped++
      continue
    }

    const stepRows = stepsByFlow.get(session.flowId) ?? []
    const answerByStep = await loadAnswerMap(
      session.id,
      stepRows.map((s) => s.id),
    )
    const structuredRaw = buildStructuredRawFromSteps(stepRows, answerByStep)
    const structuredDisplay = buildStructuredFromSteps(stepRows, answerByStep)

    const typeRaw =
      pickAnswer(structuredRaw, ['tipo_solicitud', 'tipo', 'type']) ??
      pickAnswer(structuredDisplay, ['tipo_solicitud', 'tipo', 'type'])
    const priorityRaw =
      pickAnswer(structuredRaw, ['urgencia', 'prioridad', 'priority']) ??
      pickAnswer(structuredDisplay, ['urgencia', 'prioridad', 'priority'])

    const mappedType = mapSupportTypeFromAnswer(typeRaw)
    const mappedPriority = mapSupportPriorityFromAnswer(priorityRaw)
    const clientAnswer =
      pickAnswer(structuredRaw, [
        'empresa',
        'compania',
        'compañia',
        'company',
        'client_company',
        'nombre_empresa',
        'organizacion',
        'organización',
      ]) ??
      pickAnswer(structuredDisplay, [
        'empresa',
        'compania',
        'compañia',
        'company',
        'client_company',
        'nombre_empresa',
        'organizacion',
        'organización',
      ])

    let mappedClientId: string | null = null
    let mappedClientCompany: string | null = null
    if (clientAnswer?.trim()) {
      if (isUuidLike(clientAnswer.trim())) {
        const name = await getClientNameById({
          organizationId,
          clientId: clientAnswer.trim(),
        })
        if (name) {
          mappedClientId = clientAnswer.trim()
          mappedClientCompany = name
        }
      }
      if (!mappedClientId) {
        const c = await ensureClientByName({ organizationId, name: clientAnswer.trim() })
        mappedClientId = c.id
        mappedClientCompany = c.name
      }
    }

    const existing = caseBySession.get(session.id)
    if (existing) {
      const companyChanged =
        Boolean(mappedClientCompany?.trim()) &&
        ((existing.clientCompany ?? null) !== (mappedClientCompany?.trim() || null) ||
          (existing.clientId ?? null) !== (mappedClientId ?? null))

      if (existing.type !== mappedType || existing.priority !== mappedPriority || companyChanged) {
        await db
          .update(supportCases)
          .set({
            type: mappedType,
            priority: mappedPriority,
            clientId: companyChanged ? mappedClientId : existing.clientId,
            clientCompany: companyChanged ? mappedClientCompany!.trim().slice(0, 200) : existing.clientCompany,
            updatedAt: new Date(),
          })
          .where(eq(supportCases.id, existing.id))
        typesUpdated++
      } else {
        skipped++
      }
      continue
    }

    const result = await db.query.results.findFirst({
      where: eq(results.sessionId, session.id),
      columns: { summary: true },
    })

    const contact =
      session.contact && typeof session.contact === 'object'
        ? (session.contact as { name?: string; email?: string; phone?: string })
        : {}

    const r = await createSupportCaseFromSession({
      organizationId,
      flowId: session.flowId,
      flowName: flow.name,
      flowSettings: flow.settings,
      sessionId: session.id,
      sessionMetadata: session.metadata,
      structuredAnswersRaw: structuredRaw,
      structuredAnswersDisplay: structuredDisplay,
      contact,
      summaryFallback: result?.summary ?? null,
    })

    if (r.created) {
      created++
      caseBySession.set(session.id, {
        id: r.caseId!,
        sessionId: session.id,
        type: mappedType,
        priority: mappedPriority,
        clientId: mappedClientId,
        clientCompany: mappedClientCompany,
      })
    } else {
      skipped++
    }
  }

  log.info({ organizationId, created, typesUpdated, skipped }, 'Support case sync finished')
  return { created, typesUpdated, skipped }
}
