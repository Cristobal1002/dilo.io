import Stripe from 'stripe'

let client: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY no configurada')
  }
  if (!client) {
    client = new Stripe(key)
  }
  return client
}
