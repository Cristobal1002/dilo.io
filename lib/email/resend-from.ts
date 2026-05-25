/**
 * Remitente para emails del servidor (invitaciones, etc.).
 * En desarrollo, si el dominio no está verificado en Resend, usa el remitente de prueba.
 */
export function resolveServerResendFrom(): string | null {
  const configured = process.env.RESEND_FROM_EMAIL?.trim()
  if (!configured) return null

  if (process.env.NODE_ENV !== 'development') return configured

  const looksUnverifiedProdDomain = /@getdilo\.io>/i.test(configured) || /@getdilo\.io$/i.test(configured)

  if (looksUnverifiedProdDomain) {
    return 'Dilo <onboarding@resend.dev>'
  }

  return configured
}
