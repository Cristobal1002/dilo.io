import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, supportCases } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { sendSupportApprovalRequestEmail } from '@/lib/email/send-support-approval-request'
import { newSupportApprovalToken, supportApprovalReviewUrl } from '@/lib/support-approval'
import { withApiHandler } from '@/lib/with-api-handler'

async function getCaseForOrg(caseId: string, organizationId: string) {
  return db.query.supportCases.findFirst({
    where: and(eq(supportCases.id, caseId), eq(supportCases.organizationId, organizationId)),
  })
}

export const POST = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const { org } = auth
  const caseId = params.caseId
  const row = await getCaseForOrg(caseId, org.id)
  if (!row) throw new NotFoundError('Caso')

  if (!row.resolutionNotes?.trim() && !row.description?.trim()) {
    throw new ValidationError(
      'Escribe qué entregaste (notas de resolución) antes de pedir aprobación al cliente.',
    )
  }

  const token = row.clientApprovalToken ?? newSupportApprovalToken()
  const now = new Date()

  const [updated] = await db
    .update(supportCases)
    .set({
      clientApprovalToken: token,
      clientApprovalStatus: 'pending',
      submittedForApprovalAt: now,
      clientRespondedAt: null,
      clientFeedback: null,
      status: row.status === 'new' ? 'in_progress' : row.status,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(supportCases.id, caseId))
    .returning()

  const reviewUrl = supportApprovalReviewUrl(token)
  let emailSent = false
  let emailError: string | null = null

  if (row.requesterEmail?.trim()) {
    const orgRow = await db.query.organizations.findFirst({
      where: eq(organizations.id, org.id),
      columns: { name: true },
    })
    const mail = await sendSupportApprovalRequestEmail({
      to: row.requesterEmail.trim(),
      organizationId: org.id,
      organizationName: orgRow?.name ?? 'Tu proveedor',
      caseNumber: row.caseNumber,
      subject: row.subject,
      reviewUrl,
    })
    emailSent = mail.sent
    emailError = mail.error ?? null
  }

  return apiSuccess({
    case: updated,
    reviewUrl,
    emailSent,
    emailError,
    message: row.requesterEmail?.trim()
      ? emailSent
        ? 'Enlace enviado al correo del solicitante.'
        : `Caso en espera de aprobación. Copia el enlace (email: ${emailError ?? 'no enviado'}).`
      : 'Sin email del solicitante: copia y comparte el enlace de revisión.',
  })
}, { requireAuth: true })
