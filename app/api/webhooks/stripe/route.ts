import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { syncFromCheckoutSession, syncFromSubscription } from '@/lib/billing-sync'
import { createLogger } from '@/lib/logger'
import { getStripe } from '@/lib/stripe-client'

const log = createLogger('webhooks/stripe')

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    log.error({}, 'STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    log.warn({ err }, 'Stripe webhook signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await syncFromCheckoutSession(session)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await syncFromSubscription(subscription)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        log.warn(
          {
            invoiceId: invoice.id,
            customerId: invoice.customer,
            subscriptionId: invoice.subscription,
          },
          'Stripe invoice payment failed',
        )
        break
      }
      default:
        break
    }
  } catch (err) {
    log.error({ err, type: event.type, id: event.id }, 'Stripe webhook handler failed')
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
