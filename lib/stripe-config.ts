import type { Plan } from '@/lib/plan-limits'

/** Secret key limpia o null si falta / formato inválido. */
export function stripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null

  if (/^pk_(test|live)_/.test(key)) {
    return null
  }

  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(key)) {
    return null
  }

  return key
}

export function isStripeConfigured(): boolean {
  return Boolean(stripeSecretKey() && process.env.STRIPE_PRICE_PRO?.trim())
}

export function stripePriceIdForPlan(planId: Exclude<Plan, 'free'>): string | null {
  if (planId === 'pro') return process.env.STRIPE_PRICE_PRO?.trim() || null
  if (planId === 'agency') return process.env.STRIPE_PRICE_AGENCY?.trim() || null
  return null
}

export function planIdFromStripePriceId(priceId: string): Plan | null {
  const pro = process.env.STRIPE_PRICE_PRO?.trim()
  const agency = process.env.STRIPE_PRICE_AGENCY?.trim()
  if (pro && priceId === pro) return 'pro'
  if (agency && priceId === agency) return 'agency'
  return null
}

export function isPaidSubscriptionStatus(status: string): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}
