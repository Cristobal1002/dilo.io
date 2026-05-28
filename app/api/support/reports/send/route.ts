import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clients, organizations } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { sendSupportValueReportEmail } from '@/lib/email/send-support-value-report'
import { requireOrgRoles } from '@/lib/org-role'
import { loadSupportValueReportPreview, parseReportMonth } from '@/lib/support-value-report'
import { withApiHandler } from '@/lib/with-api-handler'

const Body = z.object({
  month: z.string().max(7),
  to: z.string().email().max(320),
  narrativeMarkdown: z.string().trim().min(20).max(16000),
  clientId: z.string().uuid().nullable().optional(),
})

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  const body = await req.json()
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const month = parsed.data.month.trim()
  if (!parseReportMonth(month)) {
    throw new ValidationError('Mes inválido')
  }

  const clientId = parsed.data.clientId?.trim() || null
  const clientCompany = clientId
    ? (await db.query.clients.findFirst({
        where: and(eq(clients.id, clientId), eq(clients.organizationId, auth.org.id)),
        columns: { name: true },
      }))?.name ?? null
    : null
  const preview = await loadSupportValueReportPreview({
    organizationId: auth.org.id,
    month,
    clientId,
  })

  if (!preview || preview.totalCases === 0) {
    throw new ValidationError('No hay datos para enviar en ese periodo')
  }

  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.id, auth.org.id),
    columns: { name: true },
  })

  const mail = await sendSupportValueReportEmail({
    to: parsed.data.to.trim(),
    organizationId: auth.org.id,
    organizationName: orgRow?.name ?? 'Tu proveedor',
    preview,
    narrativeMarkdown: parsed.data.narrativeMarkdown,
    clientCompany,
  })

  return apiSuccess({
    emailSent: mail.sent,
    emailError: mail.error ?? null,
    message: mail.sent
      ? `Informe enviado a ${parsed.data.to}`
      : `No se pudo enviar: ${mail.error ?? 'error desconocido'}. Copia el texto y envíalo manualmente.`,
  })
}, { requireAuth: true })
