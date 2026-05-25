/** Resend en modo prueba (`onboarding@resend.dev`) solo permite enviar al email de la cuenta. */
export function isResendTestRecipientOnlyError(message: string): boolean {
  return /only send testing emails to your own email/i.test(message)
}

export function isResendDomainNotVerifiedError(message: string): boolean {
  return /domain is not verified/i.test(message)
}
