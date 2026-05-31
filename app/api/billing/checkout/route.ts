import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { publicAppBaseUrl } from '@/lib/outreach'
import { isStripeConfigured, stripePriceIdForPlan } from '@/lib/stripe-config'
import { getStripe } from '@/lib/stripe-client'
import { validationErrorFromStripe } from '@/lib/stripe-errors'
import { withApiHandler } from '@/lib/with-api-handler'
import type { Plan } from '@/lib/plan-limits'
import { createLogger } from '@/lib/logger'

const log = createLogger('billing/checkout')

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
      where: and(eq(users.organizationId, auth.org.id), eq(users.role, 'owner')),
      columns: { email: true },
    })

    const stripe = getStripe()
    const baseUrl = publicAppBaseUrl()

    const createSession = (customerId?: string) =>
      stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/dashboard/account?tab=plan&checkout=success`,
        cancel_url: `${baseUrl}/dashboard/account?tab=plan&checkout=cancel`,
        client_reference_id: auth.org.id,
        customer: customerId,
        customer_email: customerId ? undefined : owner?.email ?? undefined,
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

    let session
    try {
      session = await createSession(auth.org.stripeCustomerId ?? undefined)
    } catch (err) {
      const mapped = validationErrorFromStripe(err)
      const staleCustomer =
        auth.org.stripeCustomerId &&
        mapped?.message.includes('Cliente o precio de Stripe no encontrado')

      if (staleCustomer) {
        log.warn(
          { orgId: auth.org.id, stripeCustomerId: auth.org.stripeCustomerId },
          'Stale Stripe customer id; retrying checkout without customer',
        )
        try {
          session = await createSession(undefined)
        } catch (retryErr) {
          const retryMapped = validationErrorFromStripe(retryErr)
          if (retryMapped) throw retryMapped
          throw retryErr
        }
      } else if (mapped) {
        throw mapped
      } else {
        log.error({ err, orgId: auth.org.id, planId }, 'Stripe checkout session failed')
        throw err
      }
    }

    if (!session.url) {
      throw new ValidationError('No se pudo iniciar el checkout')
    }

    return apiSuccess({ url: session.url })
  },
  { requireAuth: true },
)
