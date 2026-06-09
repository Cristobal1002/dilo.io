import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { supportCases } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import {
  canPortalEditNotes,
  canPortalEditPriority,
} from '@/lib/client-portal-roles'
import { isSupportPriority, sanitizeSupportNoteText } from '@/lib/support'
import { withPortalHandler } from '@/lib/with-portal-handler'

export const GET = withPortalHandler(async (_req, { auth, params }) => {
  const row = await db.query.supportCases.findFirst({
    where: and(
      eq(supportCases.id, params.caseId),
      eq(supportCases.organizationId, auth.active.organizationId),
      eq(supportCases.clientId, auth.active.clientId),
    ),
  })
  if (!row) throw new NotFoundError('Caso')

  return apiSuccess({
    case: {
      id: row.id,
      caseNumber: row.caseNumber,
      subject: row.subject,
      description: row.description,
      status: row.status,
      priority: row.priority,
      reportedPriority: row.reportedPriority,
      type: row.type,
      requesterName: row.requesterName,
      requesterEmail: row.requesterEmail,
      clientNotes: row.clientNotes,
      resolutionNotes: row.resolutionNotes,
      dueAt: row.dueAt,
      lastActivityAt: row.lastActivityAt,
      createdAt: row.createdAt,
    },
    role: auth.active.role,
  })
})

const PatchBody = z
  .object({
    priority: z
      .string()
      .optional()
      .refine((s) => s === undefined || isSupportPriority(s), 'Prioridad inválida'),
    clientNotes: z.string().trim().max(4000).optional().nullable(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Sin cambios' })

export const PATCH = withPortalHandler(async (req: NextRequest, { auth, params }) => {
  const role = auth.active.role
  const parsed = PatchBody.safeParse(await req.json())
  if (!parsed.success) throw new ValidationError('Datos inválidos')

  if (parsed.data.priority !== undefined && !canPortalEditPriority(role)) {
    throw new ValidationError('No tienes permiso para cambiar la prioridad')
  }
  if (parsed.data.clientNotes !== undefined && !canPortalEditNotes(role)) {
    throw new ValidationError('No tienes permiso para agregar notas')
  }

  const existing = await db.query.supportCases.findFirst({
    where: and(
      eq(supportCases.id, params.caseId),
      eq(supportCases.organizationId, auth.active.organizationId),
      eq(supportCases.clientId, auth.active.clientId),
    ),
  })
  if (!existing) throw new NotFoundError('Caso')

  const now = new Date()
  const patch: Partial<typeof supportCases.$inferInsert> = {
    updatedAt: now,
    lastActivityAt: now,
  }
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority
  if (parsed.data.clientNotes !== undefined) {
    patch.clientNotes = parsed.data.clientNotes
      ? sanitizeSupportNoteText(parsed.data.clientNotes)
      : null
  }

  const [row] = await db.update(supportCases).set(patch).where(eq(supportCases.id, params.caseId)).returning()
  return apiSuccess({ case: row })
})
