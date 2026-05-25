import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, supportCases } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import {
  isSupportClientApprovalAction,
  SUPPORT_TYPE_LABEL,
  type SupportCaseType,
} from '@/lib/support'
import { withApiHandler } from '@/lib/with-api-handler'

async function getCaseByToken(token: string) {
  return db.query.supportCases.findFirst({
    where: eq(supportCases.clientApprovalToken, token),
  })
}

export const GET = withApiHandler(
  async (_req: NextRequest, { params }) => {
    const token = params.token
    const row = await getCaseByToken(token)
    if (!row || !row.clientApprovalStatus) {
      throw new NotFoundError('Enlace de revisión no válido')
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, row.organizationId),
      columns: { name: true },
    })

    return apiSuccess({
      clientApprovalStatus: row.clientApprovalStatus,
      caseNumber: row.caseNumber,
      subject: row.subject,
      description: row.description,
      resolutionNotes: row.resolutionNotes,
      type: row.type,
      typeLabel: SUPPORT_TYPE_LABEL[row.type as SupportCaseType] ?? row.type,
      clientCompany: row.clientCompany,
      requesterName: row.requesterName,
      hoursSpent: row.hoursSpent,
      dueAt: row.dueAt,
      requestedAt: row.createdAt,
      organizationName: org?.name ?? 'Proveedor',
    })
  },
  { requireAuth: false },
)

const RespondBody = z.object({
  action: z.string().refine(isSupportClientApprovalAction, 'Acción inválida'),
  feedback: z.string().trim().max(4000).optional(),
})

export const POST = withApiHandler(
  async (req: NextRequest, { params }) => {
    const token = params.token
    const row = await getCaseByToken(token)
    if (!row || row.clientApprovalStatus !== 'pending') {
      throw new NotFoundError('Enlace de revisión no válido o ya utilizado')
    }

    const body = await req.json()
    const parsed = RespondBody.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
    }

    if (parsed.data.action === 'changes_requested' && !parsed.data.feedback?.trim()) {
      throw new ValidationError('Indica qué ajustes necesitas.')
    }

    const now = new Date()
    const patch: Partial<typeof supportCases.$inferInsert> = {
      clientApprovalStatus: parsed.data.action,
      clientFeedback: parsed.data.feedback?.trim() || null,
      clientRespondedAt: now,
      lastActivityAt: now,
      updatedAt: now,
    }

    if (parsed.data.action === 'approved') {
      patch.status = 'closed'
      patch.resolvedAt = row.resolvedAt ?? now
    } else if (parsed.data.action === 'cancelled') {
      patch.status = 'closed'
      patch.resolvedAt = now
    } else if (parsed.data.action === 'changes_requested') {
      patch.status = 'in_progress'
      patch.resolvedAt = null
    }

    const [updated] = await db
      .update(supportCases)
      .set(patch)
      .where(eq(supportCases.id, row.id))
      .returning()

    return apiSuccess({ case: updated })
  },
  { requireAuth: false },
)
