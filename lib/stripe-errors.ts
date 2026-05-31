import Stripe from 'stripe'
import { ValidationError } from '@/lib/errors'

export function validationErrorFromStripe(err: unknown): ValidationError | null {
  if (
    typeof err !== 'object' ||
    err === null ||
    !(err instanceof Stripe.errors.StripeError)
  ) {
    return null
  }

  const code = err.code ?? 'stripe_error'
  const message = err.message?.trim() || 'Error de Stripe'

  if (code === 'resource_missing') {
    return new ValidationError(
      'Cliente o precio de Stripe no encontrado. Verifica STRIPE_SECRET_KEY y STRIPE_PRICE_* en este entorno.',
      { stripeCode: code },
    )
  }

  if (code === 'url_invalid') {
    return new ValidationError(
      'URL de retorno inválida. Configura NEXT_PUBLIC_APP_URL=https://getdilo.io en producción.',
      { stripeCode: code },
    )
  }

  return new ValidationError(message, { stripeCode: code })
}
