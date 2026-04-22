/**
 * Clerk webhook handler — user.created
 *
 * Triggered the moment someone signs up (email, Google, or any OAuth provider).
 * Creates the organization + user record in the DB immediately, so lazy creation
 * in getAuthContext() is just a safety net, not the primary path.
 *
 * Setup (one-time, in Clerk Dashboard):
 *   1. Webhooks → Add Endpoint → https://yourdomain.com/api/webhooks/clerk
 *   2. Subscribe to: user.created
 *   3. Copy the Signing Secret → CLERK_WEBHOOK_SECRET in .env.local
 */

import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, users } from '@/db/schema'
import { createLogger } from '@/lib/logger'

const log = createLogger('webhooks/clerk')

type ClerkEmailAddress = { email_address: string; id: string }

type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: {
    id: string
    first_name: string | null
    last_name: string | null
    email_addresses: ClerkEmailAddress[]
    primary_email_address_id: string | null
    image_url: string | null
    created_at: number
  }
}

type ClerkWebhookEvent = ClerkUserCreatedEvent | { type: string; data: unknown }

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    log.error({}, 'CLERK_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Verify the webhook signature using svix
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

  if (event.type !== 'user.created') {
    // Acknowledge other events without processing
    return NextResponse.json({ ok: true })
  }

  const { id: clerkId, first_name, last_name, email_addresses, primary_email_address_id } = event.data

  const primaryEmail = email_addresses.find(
    (e) => e.id === primary_email_address_id,
  )?.email_address ?? email_addresses[0]?.email_address ?? ''

  const name = [first_name, last_name].filter(Boolean).join(' ') || null

  log.info({ clerkId, email: primaryEmail, name }, 'user.created webhook received')

  try {
    // Use clerkId as the org slug (same pattern as getAuthContext)
    const slug = clerkId

    // Upsert organization — idempotent in case of replay
    let org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    })

    if (!org) {
      const [newOrg] = await db
        .insert(organizations)
        .values({ name: 'Mi organización', slug })
        .returning()
      org = newOrg
      log.info({ orgId: org.id, clerkId }, 'Organization created via webhook')
    }

    // Upsert user — onConflictDoNothing handles replays
    await db
      .insert(users)
      .values({
        organizationId: org.id,
        clerkId,
        email: primaryEmail,
        name,
        role: 'owner',
      })
      .onConflictDoNothing()

    log.info({ clerkId, email: primaryEmail }, 'User created via webhook')

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error({ err, clerkId }, 'Failed to create user from webhook')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
