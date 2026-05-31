import type { Plan } from '@/lib/plan-limits'

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_PRO?.trim(),
  )
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
