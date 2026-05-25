import { eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { supportCases } from '@/db/schema'
import { createLogger } from '@/lib/logger'
import { isSupportFlow } from '@/lib/support-flow-purpose'
import {
  mapSupportPriorityFromAnswer,
  mapSupportTypeFromAnswer,
} from '@/lib/support'

const log = createLogger('support-case-from-session')

type StepRow = {
  id: string
  type: string
  variableName: string
}

function pickAnswer(
  structured: Record<string, string>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = structured[k]?.trim()
    if (v && v !== '(sin respuesta)') return v
  }
  return null
}

async function nextCaseNumber(organizationId: string): Promise<number> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${supportCases.caseNumber}), 0)::int` })
    .from(supportCases)
    .where(eq(supportCases.organizationId, organizationId))
  return (Number(max) || 0) + 1
}

export async function createSupportCaseFromSession(args: {
  organizationId: string
  flowId: string
  flowName: string
  flowSettings: unknown
  sessionId: string
  structuredAnswers: Record<string, string>
  contact: { name?: string; email?: string; phone?: string }
  summaryFallback?: string | null
}): Promise<{ created: boolean; caseId?: string }> {
  if (!isSupportFlow(args.flowSettings)) {
    return { created: false }
  }

  const existing = await db.query.supportCases.findFirst({
    where: eq(supportCases.sessionId, args.sessionId),
    columns: { id: true },
  })
  if (existing) {
    return { created: false, caseId: existing.id }
  }

  const subject =
    pickAnswer(args.structuredAnswers, ['asunto', 'subject', 'titulo']) ??
    `Solicitud — ${args.flowName}`.slice(0, 200)

  const description =
    pickAnswer(args.structuredAnswers, ['descripcion', 'description', 'detalle']) ??
    args.summaryFallback?.trim() ??
    null

  const typeRaw = pickAnswer(args.structuredAnswers, ['tipo_solicitud', 'tipo', 'type'])
  const priorityRaw = pickAnswer(args.structuredAnswers, ['urgencia', 'prioridad', 'priority'])

  /** Persona que envía la solicitud (no confundir con la empresa). */
  const requesterName =
    pickAnswer(args.structuredAnswers, ['nombre_contacto', 'nombre_solicitante', 'nombre', 'name']) ??
    args.contact.name ??
    null
  const requesterEmail =
    pickAnswer(args.structuredAnswers, ['email_contacto', 'email']) ?? args.contact.email ?? null
  const requesterPhone =
    pickAnswer(args.structuredAnswers, ['telefono_contacto', 'telefono', 'phone']) ?? args.contact.phone ?? null

  /** Organización donde trabaja el solicitante (informes mensuales por empresa). */
  const clientCompany = pickAnswer(args.structuredAnswers, [
    'empresa',
    'compania',
    'compañia',
    'company',
    'client_company',
    'nombre_empresa',
    'organizacion',
    'organización',
  ])

  const now = new Date()
  const caseNumber = await nextCaseNumber(args.organizationId)

  try {
    const [row] = await db
      .insert(supportCases)
      .values({
        organizationId: args.organizationId,
        caseNumber,
        flowId: args.flowId,
        sessionId: args.sessionId,
        status: 'new',
        priority: mapSupportPriorityFromAnswer(priorityRaw),
        type: mapSupportTypeFromAnswer(typeRaw),
        subject: subject.slice(0, 500),
        description: description?.slice(0, 8000) ?? null,
        requesterName: requesterName?.slice(0, 200) ?? null,
        requesterEmail: requesterEmail?.slice(0, 320) ?? null,
        requesterPhone: requesterPhone?.slice(0, 80) ?? null,
        clientCompany: clientCompany?.slice(0, 200) ?? null,
        lastActivityAt: now,
        updatedAt: now,
      })
      .returning({ id: supportCases.id })

    log.info(
      { caseId: row.id, caseNumber, sessionId: args.sessionId, flowId: args.flowId },
      'Support case created from session',
    )
    return { created: true, caseId: row.id }
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
    if (code === '23505') {
      log.debug({ sessionId: args.sessionId }, 'Support case already exists (race)')
      return { created: false }
    }
    throw e
  }
}
