import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { createLogger } from '@/lib/logger'
import type { Plan } from '@/lib/plan-limits'
import { isPaidSubscriptionStatus, planIdFromStripePriceId } from '@/lib/stripe-config'

const log = createLogger('billing-sync')

function subscriptionPriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0]
  const price = item?.price
  if (!price) return null
  return typeof price === 'string' ? price : price.id
}

function organizationIdFromMetadata(meta: Stripe.Metadata | null | undefined): string | null {
  const id = meta?.organizationId?.trim()
  return id || null
}

export async function applySubscriptionToOrganization(args: {
  organizationId: string
  customerId: string | null
  subscriptionId: string | null
  subscription: Stripe.Subscription | null
}): Promise<{ plan: Plan }> {
  const { organizationId, customerId, subscriptionId, subscription } = args

  let plan: Plan = 'free'
  if (subscription && isPaidSubscriptionStatus(subscription.status)) {
    const priceId = subscriptionPriceId(subscription)
    const mapped = priceId ? planIdFromStripePriceId(priceId) : null
    if (mapped) plan = mapped
  }

  await db
    .update(organizations)
    .set({
      plan,
      planStartedAt: plan === 'free' ? null : new Date(),
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      stripeSubscriptionId: plan === 'free' ? null : subscriptionId,
    })
    .where(eq(organizations.id, organizationId))

  log.info({ organizationId, plan, subscriptionId }, 'Organization billing synced')
  return { plan }
}

export async function syncFromCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const organizationId =
    organizationIdFromMetadata(session.metadata) ?? session.client_reference_id?.trim() ?? null
  if (!organizationId) {
    log.warn({ sessionId: session.id }, 'Checkout session missing organizationId')
    return
  }

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null

  if (!subscriptionId) {
    log.warn({ sessionId: session.id, organizationId }, 'Checkout session missing subscription')
    return
  }

  const { getStripe } = await import('@/lib/stripe-client')
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)

  await applySubscriptionToOrganization({
    organizationId,
    customerId,
    subscriptionId,
    subscription,
  })
}

export async function syncFromSubscription(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = organizationIdFromMetadata(subscription.metadata)
  if (!organizationId) {
    log.warn({ subscriptionId: subscription.id }, 'Subscription missing organizationId metadata')
    return
  }

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null

  await applySubscriptionToOrganization({
    organizationId,
    customerId,
    subscriptionId: isPaidSubscriptionStatus(subscription.status) ? subscription.id : null,
    subscription,
  })
}
