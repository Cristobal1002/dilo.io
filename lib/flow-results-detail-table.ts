import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { answers, stepOptions, steps } from '@/db/schema'
import { formatFlowAnswerDisplay } from '@/lib/format-flow-answer'
import {
  fileAnswerRawHasDownloadableSource,
  fileAnswerRawHasListedAttachments,
} from '@/lib/flow-results-file-resources'

export type DetailContactColumn = { key: string; label: string }

export type DetailStepColumn = {
  stepId: string
  header: string
  /** Texto completo de la pregunta (p. ej. tooltip en cabeceras). */
  fullQuestion: string
  type: string
  options: { label: string; value: string }[]
}

export type DetailTableRow = {
  sessionId: string
  classification: string | null
  score: number | null
  /** ISO 8601; null si no hay fecha de cierre. */
  completedAt: string | null
  /** Nombre para mostrar / buscar (desde contact). */
  displayName: string
  contact: Record<string, string | null>
  stepCells: Record<string, string>
  /** Hay respuestas de paso `file` con archivos listados (mostrar «Descargar recursos» en el menú). */
  hasFileAttachments: boolean
  /** Hay data URL o URL remota guardada (la opción de descarga puede activarse). */
  hasDownloadableFileData: boolean
}

export type FlowResultsDetailTable = {
  hasScores: boolean
  contactColumns: DetailContactColumn[]
  stepColumns: DetailStepColumn[]
  rows: DetailTableRow[]
}

function normalizeContact(raw: unknown): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v == null) out[k] = null
    else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = String(v)
  }
  return out
}

/** Claves que se muestran solo en la columna «Nombre», no como columnas extra. */
const CONTACT_KEYS_IN_NAME = new Set(['fullname', 'name', 'firstname', 'lastname', 'nombre'])

function deriveDisplayName(contact: Record<string, string | null>): string {
  const pick = (k: string) => (contact[k] ?? '').trim()
  const full = pick('fullName')
  if (full) return full
  const name = pick('name')
  if (name) return name
  const first = pick('firstName')
  const last = pick('lastName')
  if (first || last) return [first, last].filter(Boolean).join(' ')
  const nombre = pick('nombre')
  return nombre
}

function labelFromContactKey(k: string): string {
  const map: Record<string, string> = {
    email: 'Email',
    phone: 'Teléfono',
    name: 'Nombre',
    fullName: 'Nombre completo',
    firstName: 'Nombre',
    lastName: 'Apellidos',
    company: 'Empresa',
  }
  if (map[k]) return map[k]
  return k
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function getFlowResultsDetailTable(
  flowId: string,
  sessionRows: {
    sessionId: string
    completedAt: Date | null
    classification: string | null
    score: number | null
    contact: unknown
  }[],
): Promise<FlowResultsDetailTable> {
  const hasScores = sessionRows.some((r) => r.score != null)

  const contactKeySet = new Set<string>()
  const normalizedContacts = sessionRows.map((r) => {
    const c = normalizeContact(r.contact)
    for (const k of Object.keys(c)) {
      contactKeySet.add(k)
    }
    return c
  })

  const contactColumns: DetailContactColumn[] = [...contactKeySet]
    .filter((key) => !CONTACT_KEYS_IN_NAME.has(key.toLowerCase()))
    .sort()
    .map((key) => ({
      key,
      label: labelFromContactKey(key),
    }))

  const stepRows = await db.query.steps.findMany({
    where: eq(steps.flowId, flowId),
    orderBy: asc(steps.order),
  })

  const stepColumns: DetailStepColumn[] = await Promise.all(
    stepRows.map(async (s) => {
      const opts = await db.query.stepOptions.findMany({
        where: eq(stepOptions.stepId, s.id),
        orderBy: asc(stepOptions.order),
      })
      const short =
        s.question.length > 56 ? `${s.question.slice(0, 53)}…` : s.question
      return {
        stepId: s.id,
        header: short,
        fullQuestion: s.question,
        type: s.type,
        options: opts.map((o) => ({ label: o.label, value: o.value })),
      }
    }),
  )

  const sessionIds = sessionRows.map((r) => r.sessionId)
  const answerRows =
    sessionIds.length === 0
      ? []
      : await db
          .select({
            sessionId: answers.sessionId,
            stepId: answers.stepId,
            value: answers.value,
          })
          .from(answers)
          .where(inArray(answers.sessionId, sessionIds))

  const bySession = new Map<string, Map<string, string | null>>()
  for (const id of sessionIds) {
    bySession.set(id, new Map())
  }
  for (const a of answerRows) {
    bySession.get(a.sessionId)?.set(a.stepId, a.value ?? null)
  }

  const rows: DetailTableRow[] = sessionRows.map((r, i) => {
    const contact = normalizedContacts[i] ?? {}
    const displayName = deriveDisplayName(contact)
    const amap = bySession.get(r.sessionId) ?? new Map()
    const stepCells: Record<string, string> = {}
    let hasFileAttachments = false
    let hasDownloadableFileData = false
    for (const col of stepColumns) {
      const raw = amap.get(col.stepId) ?? null
      stepCells[col.stepId] = formatFlowAnswerDisplay(col.type, raw, col.options)
      if (col.type === 'file') {
        if (fileAnswerRawHasListedAttachments(raw)) hasFileAttachments = true
        if (fileAnswerRawHasDownloadableSource(raw)) hasDownloadableFileData = true
      }
    }
    return {
      sessionId: r.sessionId,
      classification: r.classification,
      score: r.score,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      displayName,
      contact,
      stepCells,
      hasFileAttachments,
      hasDownloadableFileData,
    }
  })

  return {
    hasScores,
    contactColumns,
    stepColumns,
    rows,
  }
}
