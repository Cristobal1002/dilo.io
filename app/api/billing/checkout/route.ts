import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { env } from '@/lib/env'
import { requireOrgRoles } from '@/lib/org-role'
import { isStripeConfigured, stripePriceIdForPlan } from '@/lib/stripe-config'
import { getStripe } from '@/lib/stripe-client'
import { withApiHandler } from '@/lib/with-api-handler'
import type { Plan } from '@/lib/plan-limits'

const BodySchema = z.object({
  planId: z.enum(['pro', 'agency']),
})

export const POST = withApiHandler(
  async (req: NextRequest, { auth }) => {
    requireOrgRoles(auth, ['owner'])

    if (!isStripeConfigured()) {
      throw new ValidationError(
        'Pagos no configurados. Añade STRIPE_SECRET_KEY y STRIPE_PRICE_PRO en el entorno.',
      )
    }

    let json: unknown
    try {
      json = await req.json()
    } catch {
      throw new ValidationError('JSON inválido')
    }

    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      throw new ValidationError('Plan inválido')
    }

    const planId = parsed.data.planId as Exclude<Plan, 'free'>
    const priceId = stripePriceIdForPlan(planId)
    if (!priceId) {
      throw new ValidationError(`Precio de Stripe no configurado para el plan ${planId}`)
    }

    const owner = await db.query.users.findFirst({
      where: eq(users.organizationId, auth.org.id),
      columns: { email: true, role: true },
    })

    const stripe = getStripe()
    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/account?tab=plan&checkout=success`,
      cancel_url: `${baseUrl}/dashboard/account?tab=plan&checkout=cancel`,
      client_reference_id: auth.org.id,
      customer: auth.org.stripeCustomerId ?? undefined,
      customer_email: auth.org.stripeCustomerId ? undefined : owner?.email ?? undefined,
      metadata: {
        app: 'dilo',
        organizationId: auth.org.id,
        planId,
      },
      subscription_data: {
        metadata: {
          app: 'dilo',
          organizationId: auth.org.id,
          planId,
        },
      },
    })

    if (!session.url) {
      throw new ValidationError('No se pudo iniciar el checkout')
    }

    return apiSuccess({ url: session.url })
  },
  { requireAuth: true },
)
