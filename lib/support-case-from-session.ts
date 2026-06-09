import { eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { supportCases } from '@/db/schema'
import { createLogger } from '@/lib/logger'
import { isSupportFlow } from '@/lib/support-flow-purpose'
import { shouldCreateSupportCase } from '@/lib/session-deflection'
import { ensureClientByName, getClientNameById, isUuidLike } from '@/lib/support-clients'
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

function looksLikeInternalValue(v: string): boolean {
  const s = v.trim()
  if (!s) return false
  if (s.includes('_')) return true
  if (s.includes('-')) return true
  // Mostly lowercase + digits is often an internal value/slug
  const letters = s.replace(/[^a-zA-Z]/g, '')
  if (letters.length >= 4 && letters === letters.toLowerCase()) return true
  return false
}

function pickClientCompany(args: {
  raw: Record<string, string>
  display?: Record<string, string> | null
}): string | null {
  const keys = [
    'empresa',
    'compania',
    'compañia',
    'company',
    'client_company',
    'nombre_empresa',
    'organizacion',
    'organización',
  ]
  const fromRaw = pickAnswer(args.raw, keys)
  const fromDisplay = args.display ? pickAnswer(args.display, keys) : null
  if (fromRaw && fromDisplay && looksLikeInternalValue(fromRaw) && !looksLikeInternalValue(fromDisplay)) {
    return fromDisplay
  }
  return fromRaw ?? fromDisplay
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
  sessionMetadata?: unknown
  structuredAnswersRaw: Record<string, string>
  structuredAnswersDisplay?: Record<string, string> | null
  contact: { name?: string; email?: string; phone?: string }
  summaryFallback?: string | null
  /** Desde metadata.embedContext de la sesión (embed multi-tenant). */
  sessionClientId?: string | null
}): Promise<{ created: boolean; caseId?: string }> {
  if (!isSupportFlow(args.flowSettings)) {
    return { created: false }
  }

  if (!shouldCreateSupportCase({ flowSettings: args.flowSettings, sessionMetadata: args.sessionMetadata })) {
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
    pickAnswer(args.structuredAnswersRaw, ['asunto', 'subject', 'titulo']) ??
    `Solicitud — ${args.flowName}`.slice(0, 200)

  const description =
    pickAnswer(args.structuredAnswersRaw, ['descripcion', 'description', 'detalle']) ??
    args.summaryFallback?.trim() ??
    null

  const typeRaw =
    pickAnswer(args.structuredAnswersRaw, ['tipo_solicitud', 'tipo', 'type']) ??
    pickAnswer(args.structuredAnswersDisplay ?? {}, ['tipo_solicitud', 'tipo', 'type'])
  const priorityRaw =
    pickAnswer(args.structuredAnswersRaw, ['urgencia', 'prioridad', 'priority']) ??
    pickAnswer(args.structuredAnswersDisplay ?? {}, ['urgencia', 'prioridad', 'priority'])

  /** Persona que envía la solicitud (no confundir con la empresa). */
  const requesterName =
    pickAnswer(args.structuredAnswersRaw, ['nombre_contacto', 'nombre_solicitante', 'nombre', 'name']) ??
    pickAnswer(args.structuredAnswersDisplay ?? {}, ['nombre_contacto', 'nombre_solicitante', 'nombre', 'name']) ??
    args.contact.name ??
    null
  const requesterEmail =
    pickAnswer(args.structuredAnswersRaw, ['email_contacto', 'email']) ??
    pickAnswer(args.structuredAnswersDisplay ?? {}, ['email_contacto', 'email']) ??
    args.contact.email ??
    null
  const requesterPhone =
    pickAnswer(args.structuredAnswersRaw, ['telefono_contacto', 'telefono', 'phone']) ??
    pickAnswer(args.structuredAnswersDisplay ?? {}, ['telefono_contacto', 'telefono', 'phone']) ??
    args.contact.phone ??
    null

  /** Organización donde trabaja el solicitante (informes mensuales por empresa). */
  const clientAnswer = pickClientCompany({
    raw: args.structuredAnswersRaw,
    display: args.structuredAnswersDisplay ?? null,
  })
  let clientId: string | null = null
  let clientCompany: string | null = null

  // Embed: clientId fijado al crear la sesión (dashboard multi-tenant del partner).
  if (args.sessionClientId && isUuidLike(args.sessionClientId)) {
    const name = await getClientNameById({
      organizationId: args.organizationId,
      clientId: args.sessionClientId.trim(),
    })
    if (name) {
      clientId = args.sessionClientId.trim()
      clientCompany = name
    }
  }

  // Pro mode: el step "empresa" puede guardar clientId (uuid) como value.
  if (!clientId && clientAnswer && isUuidLike(clientAnswer)) {
    const name = await getClientNameById({
      organizationId: args.organizationId,
      clientId: clientAnswer.trim(),
    })
    if (name) {
      clientId = clientAnswer.trim()
      clientCompany = name
    }
  }

  // Fallback: string libre → crea/asegura client + usa su nombre canónico.
  if (!clientId && clientAnswer?.trim()) {
    const c = await ensureClientByName({
      organizationId: args.organizationId,
      name: clientAnswer.trim(),
    })
    clientId = c.id
    clientCompany = c.name
  }

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
        reportedPriority: mapSupportPriorityFromAnswer(priorityRaw),
        type: mapSupportTypeFromAnswer(typeRaw),
        subject: subject.slice(0, 500),
        description: description?.slice(0, 8000) ?? null,
        requesterName: requesterName?.slice(0, 200) ?? null,
        requesterEmail: requesterEmail?.slice(0, 320) ?? null,
        requesterPhone: requesterPhone?.slice(0, 80) ?? null,
        clientId,
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
