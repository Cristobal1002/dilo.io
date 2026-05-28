import { Resend } from 'resend'
import { createLogger } from '@/lib/logger'
import { resolveResendSendConfig } from '@/lib/email/org-resend'

const log = createLogger('email/support-approval')

export async function sendSupportApprovalRequestEmail(args: {
  to: string
  organizationId: string
  organizationName: string
  caseNumber: number
  subject: string
  reviewUrl: string
}): Promise<{ sent: boolean; error?: string }> {
  const cfg = await resolveResendSendConfig(args.organizationId)
  if (!cfg) {
    return { sent: false, error: 'Resend no configurado en el servidor.' }
  }

  const from = `${args.organizationName} <${cfg.from}>`
  const resend = new Resend(cfg.apiKey)
  const html = `
    <p>Hola,</p>
    <p><strong>${args.organizationName}</strong> terminó el trabajo en tu solicitud <strong>#${args.caseNumber}</strong>:</p>
    <p style="margin:12px 0;padding:12px;background:#f8f9fb;border-radius:8px;">${escapeHtml(args.subject)}</p>
    <p>Revisa el resultado y confirma si está aprobado, si necesitas ajustes o si deseas cancelar:</p>
    <p><a href="${args.reviewUrl}" style="display:inline-block;padding:10px 18px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Revisar solicitud</a></p>
    <p style="font-size:12px;color:#64748b;">Si el botón no funciona: ${args.reviewUrl}</p>
  `.trim()

  try {
    const { error } = await resend.emails.send({
      from,
      to: args.to,
      subject: `[${args.organizationName}] Revisa tu solicitud #${args.caseNumber}`,
      html,
    })
    if (error) {
      log.warn({ err: error, to: args.to }, 'Resend support approval email failed')
      return { sent: false, error: error.message }
    }
    return { sent: true }
  } catch (e) {
    log.error({ err: e, to: args.to }, 'Resend support approval email exception')
    return { sent: false, error: e instanceof Error ? e.message : 'Error al enviar correo' }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
