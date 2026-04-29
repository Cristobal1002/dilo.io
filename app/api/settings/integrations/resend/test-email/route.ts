import { z } from 'zod'
import { db } from '@/db'
import { users } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { buildTestEmail } from '@/lib/email-templates/test-email'
import { withApiHandler } from '@/lib/with-api-handler'
import { Resend } from 'resend'
import { eq } from 'drizzle-orm'

const Body = z
  .object({
    toEmail: z.string().trim().email().max(320).optional(),
  })
  .optional()

export const POST = withApiHandler(async (req, { auth }) => {
  const body = await req.json().catch(() => ({}))
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const cfg = await resolveResendSendConfig(auth.org.id)
  if (!cfg) {
    throw new ValidationError('Resend está incompleto: guarda API key y remitente (from) en Integraciones.')
  }

  const toEmail =
    parsed.data?.toEmail?.trim() ||
    (await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      columns: { email: true },
    }))?.email

  if (!toEmail) {
    throw new ValidationError('No pudimos detectar tu email. Pasa `toEmail` explícitamente.')
  }

  const resend = new Resend(cfg.apiKey)
  const { error } = await resend.emails.send({
    from: `Dilo <${cfg.from}>`,
    to: toEmail,
    subject: 'Dilo · Email de prueba (Resend)',
    html: buildTestEmail({ toEmail }),
  })

  if (error) {
    throw new ValidationError(error.message)
  }

  return apiSuccess({ toEmail })
}, { requireAuth: true })

