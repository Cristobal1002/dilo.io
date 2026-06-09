/**
 * Clerk webhooks — usuarios (auth). El workspace vive en Neon, no en Clerk Organizations.
 *
 * Setup (Clerk Dashboard → Webhooks):
 *   - Endpoint: https://yourdomain.com/api/webhooks/clerk
 *   - Events: user.created
 *   - Signing secret → CLERK_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { acceptPendingInvitesForEmail } from '@/lib/team-invitations'
import { acceptPendingClientInvitesForEmail } from '@/lib/client-invitations'
import { linkPendingClientMembersByEmail } from '@/lib/client-portal-provision'
import { createLogger } from '@/lib/logger'

const log = createLogger('webhooks/clerk')

type ClerkEmailAddress = { email_address: string; id: string }

type ClerkUserCreatedData = {
  id: string
  first_name: string | null
  last_name: string | null
  email_addresses: ClerkEmailAddress[]
  primary_email_address_id: string | null
}

type ClerkWebhookEvent = { type: string; data: unknown }

function primaryEmail(data: ClerkUserCreatedData): string {
  return (
    data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address ??
    data.email_addresses[0]?.email_address ??
    ''
  )
}

function userName(data: ClerkUserCreatedData): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : null
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    log.error({}, 'CLERK_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()

  let event: ClerkWebhookEvent
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    log.warn({ err }, 'Invalid webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'user.created': {
        const data = event.data as ClerkUserCreatedData
        const email = primaryEmail(data)
        if (email) {
          await acceptPendingInvitesForEmail(data.id, email, userName(data))
          await acceptPendingClientInvitesForEmail(data.id, email, userName(data))
          await linkPendingClientMembersByEmail(data.id, email, userName(data))
        }
        log.info({ clerkId: data.id, email }, 'user.created — pending invites processed')
        break
      }

      default:
        break
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error({ err, type: event.type }, 'Clerk webhook handler failed')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
