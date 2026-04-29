import { buildEmailLayout } from '@/lib/email-templates/email-layout'
import { escapeHtml } from '@/lib/email-templates/utils'

export function buildTestEmail({ toEmail }: { toEmail: string }): string {
  const safeEmail = escapeHtml(toEmail)
  const bodyHtml = `
<p style="margin:0 0 12px 0;">Este es un email de prueba para verificar que Resend está configurado correctamente en tu workspace.</p>
<p style="margin:0 0 12px 0;">Destino: <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">${safeEmail}</span></p>
<p style="margin:0;">Si lo recibiste, ya puedes enviar emails desde Dilo.</p>
`.trim()

  return buildEmailLayout({
    title: 'Email de prueba',
    bodyHtml,
  })
}

