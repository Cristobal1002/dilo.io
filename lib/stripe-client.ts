import Stripe from 'stripe'
import { ValidationError } from '@/lib/errors'
import { stripeSecretKey } from '@/lib/stripe-config'

let client: Stripe | null = null
let clientKey: string | null = null

export function getStripe(): Stripe {
  const key = stripeSecretKey()
  if (!key) {
    const raw = process.env.STRIPE_SECRET_KEY?.trim() ?? ''
    if (/^pk_(test|live)_/.test(raw)) {
      throw new ValidationError(
        'STRIPE_SECRET_KEY debe ser la clave secreta (sk_test_… o sk_live_…), no la publishable (pk_…).',
      )
    }
    throw new ValidationError(
      'STRIPE_SECRET_KEY inválida. En Vercel pega solo la clave sk_test_… o sk_live_…, sin comillas ni el nombre de la variable.',
    )
  }

  if (!client || clientKey !== key) {
    client = new Stripe(key)
    clientKey = key
  }
  return client
}
