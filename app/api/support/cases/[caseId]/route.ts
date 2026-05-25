import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, results, supportCases, users } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import {
  isSupportCaseType,
  isSupportPriority,
  isSupportStatus,
  sanitizeSupportNoteText,
} from '@/lib/support'
import { supportApprovalReviewUrl } from '@/lib/support-approval'
import { withApiHandler } from '@/lib/with-api-handler'

const PatchBody = z
  .object({
    status: z
      .string()
      .optional()
      .refine((s) => s === undefined || isSupportStatus(s), 'Estado inválido'),
    priority: z
      .string()
      .optional()
      .refine((s) => s === undefined || isSupportPriority(s), 'Prioridad inválida'),
    type: z
      .string()
      .optional()
      .refine((s) => s === undefined || isSupportCaseType(s), 'Tipo inválido'),
    assignedUserId: z.string().uuid().nullable().optional(),
    internalNotes: z.string().trim().max(8000).optional().nullable(),
    resolutionNotes: z.string().trim().max(8000).optional().nullable(),
    hoursSpent: z
      .union([z.number(), z.string(), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined
        if (v === null || v === '') return null
        const n = typeof v === 'number' ? v : Number(v)
        if (!Number.isFinite(n)) return Number.NaN
        return n
      })
      .pipe(z.number().min(0).max(9999).nullable().optional()),
    dueAt: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined
        if (v === null) return null
        if (typeof v !== 'string' || v.trim() === '') return null
        const d = new Date(v)
        if (!Number.isFinite(d.getTime())) return Number.NaN
        return d
      })
      .pipe(z.date().nullable().optional()),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Sin cambios' })

async function getCaseForOrg(caseId: string, organizationId: string) {
  return db.query.supportCases.findFirst({
    where: and(eq(supportCases.id, caseId), eq(supportCases.organizationId, organizationId)),
  })
}

export const GET = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const { org } = auth
  const caseId = params.caseId
  const row = await getCaseForOrg(caseId, org.id)
  if (!row) throw new NotFoundError('Caso')

  let flowName: string | null = null
  if (row.flowId) {
    const f = await db.query.flows.findFirst({
      where: and(eq(flows.id, row.flowId), eq(flows.organizationId, org.id)),
      columns: { name: true },
    })
    flowName = f?.name ?? null
  }

  let assigneeName: string | null = null
  if (row.assignedUserId) {
    const u = await db.query.users.findFirst({
      where: and(eq(users.id, row.assignedUserId), eq(users.organizationId, org.id)),
      columns: { name: true, email: true },
    })
    assigneeName = u ? u.name?.trim() || u.email : null
  }

  let sessionSummary: string | null = null
  let sessionClassification: string | null = null
  if (row.sessionId) {
    const result = await db.query.results.findFirst({
      where: eq(results.sessionId, row.sessionId),
      columns: { summary: true, classification: true },
    })
    sessionSummary = result?.summary ?? null
    sessionClassification = result?.classification ?? null
  }

  return apiSuccess({
    case: row,
    flowName,
    assigneeName,
    sessionSummary,
    sessionClassification,
    reviewUrl: row.clientApprovalToken ? supportApprovalReviewUrl(row.clientApprovalToken) : null,
  })
}, { requireAuth: true })

export const PATCH = withApiHandler(async (req: NextRequest, { auth, params }) => {
  const { org } = auth
  const caseId = params.caseId
  const existing = await getCaseForOrg(caseId, org.id)
  if (!existing) throw new NotFoundError('Caso')

  const body = await req.json()
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  if (parsed.data.assignedUserId) {
    const assignee = await db.query.users.findFirst({
      where: and(eq(users.id, parsed.data.assignedUserId), eq(users.organizationId, org.id)),
      columns: { id: true },
    })
    if (!assignee) throw new ValidationError('Usuario asignado no pertenece al workspace')
  }

  const now = new Date()
  const patch: Partial<typeof supportCases.$inferInsert> = {
    updatedAt: now,
    lastActivityAt: now,
  }

  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status
    if (parsed.data.status === 'resolved' || parsed.data.status === 'closed') {
      patch.resolvedAt = existing.resolvedAt ?? now
    } else {
      patch.resolvedAt = null
    }
  }
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority
  if (parsed.data.type !== undefined) patch.type = parsed.data.type
  if (parsed.data.assignedUserId !== undefined) {
    patch.assignedUserId = parsed.data.assignedUserId
  }
  if (parsed.data.internalNotes !== undefined) {
    patch.internalNotes = parsed.data.internalNotes
      ? sanitizeSupportNoteText(parsed.data.internalNotes)
      : null
  }
  if (parsed.data.resolutionNotes !== undefined) {
    patch.resolutionNotes = parsed.data.resolutionNotes
      ? sanitizeSupportNoteText(parsed.data.resolutionNotes)
      : null
  }
  if (parsed.data.hoursSpent !== undefined) {
    patch.hoursSpent = parsed.data.hoursSpent
  }
  if (parsed.data.dueAt !== undefined) {
    patch.dueAt = parsed.data.dueAt
  }

  const [row] = await db.update(supportCases).set(patch).where(eq(supportCases.id, caseId)).returning()
  return apiSuccess({ case: row })
}, { requireAuth: true })
