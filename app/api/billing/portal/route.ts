import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { env } from '@/lib/env'
import { requireOrgRoles } from '@/lib/org-role'
import { isStripeConfigured } from '@/lib/stripe-config'
import { getStripe } from '@/lib/stripe-client'
import { withApiHandler } from '@/lib/with-api-handler'

export const POST = withApiHandler(
  async (_req, { auth }) => {
    requireOrgRoles(auth, ['owner'])

    if (!isStripeConfigured()) {
      throw new ValidationError('Pagos no configurados')
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, auth.org.id),
      columns: { stripeCustomerId: true },
    })

    if (!org?.stripeCustomerId) {
      throw new ValidationError('No hay suscripción activa en Stripe para este workspace')
    }

    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    const session = await getStripe().billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${baseUrl}/dashboard/account?tab=plan`,
    })

    return apiSuccess({ url: session.url })
  },
  { requireAuth: true },
)
