/**
 * Meta WhatsApp Cloud API webhooks — verificación + eventos (status, mensajes, plantillas).
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { whatsappMessages, whatsappTemplates } from '@/db/schema'
import { createLogger } from '@/lib/logger'
import { findOrgByWhatsAppPhoneNumberId } from '@/lib/whatsapp/get-active-integration'
import { getFacebookAppSecret, getWebhookVerifyToken } from '@/lib/whatsapp/meta-env'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/verify-meta-signature'

const log = createLogger('webhooks/whatsapp')

export async function GET(req: NextRequest) {
  const verifyToken = getWebhookVerifyToken()
  if (!verifyToken) {
    log.warn({}, 'WHATSAPP_WEBHOOK_VERIFY_TOKEN no configurado en el servidor')
    return new Response('Not configured', { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  log.warn({ mode, tokenMatch: token === verifyToken }, 'Webhook verify failed')
  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  const appSecret = getFacebookAppSecret()
  if (!appSecret) {
    log.warn({}, 'FACEBOOK_APP_SECRET no configurado; webhook POST ignorado')
    return NextResponse.json({ ok: true, skipped: true })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
    log.warn({}, 'WhatsApp webhook signature invalid')
    return new Response('Forbidden', { status: 403 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody) as unknown
  } catch {
    return NextResponse.json({ ok: true })
  }

  const entries = (body as { entry?: unknown[] })?.entry ?? []
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes ?? []
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value
      if (!value) continue

      const metadata = value.metadata as { phone_number_id?: string } | undefined
      const phoneNumberId = metadata?.phone_number_id
      const orgRef = phoneNumberId ? await findOrgByWhatsAppPhoneNumberId(phoneNumberId) : null

      const statuses = value.statuses as Array<{ id?: string; status?: string }> | undefined
      if (statuses?.length) {
        for (const st of statuses) {
          if (!st.id || !st.status) continue
          try {
            await db
              .update(whatsappMessages)
              .set({ status: st.status })
              .where(eq(whatsappMessages.metaMessageId, st.id))
          } catch (err) {
            log.error({ err, metaMessageId: st.id }, 'Failed to update message status')
          }
        }
      }

      const messages = value.messages as Array<{ id?: string; from?: string }> | undefined
      if (messages?.length && orgRef) {
        for (const msg of messages) {
          if (!msg.id) continue
          try {
            await db.insert(whatsappMessages).values({
              organizationId: orgRef.organizationId,
              direction: 'inbound',
              fromNumber: msg.from ?? null,
              metaMessageId: msg.id,
              status: 'received',
              rawPayload: msg,
            })
          } catch (err) {
            log.error({ err, metaMessageId: msg.id }, 'Failed to log inbound message')
          }
        }
      }

      const templateStatus = value.message_template_status_update as
        | { message_template_id?: string; event?: string; reason?: string }
        | undefined
      if (templateStatus?.message_template_id && orgRef) {
        const event = templateStatus.event
        const status =
          event === 'APPROVED' ? 'APPROVED' : event === 'REJECTED' ? 'REJECTED' : null
        if (status) {
          try {
            await db
              .update(whatsappTemplates)
              .set({
                status,
                rejectionReason: status === 'REJECTED' ? templateStatus.reason ?? null : null,
                updatedAt: new Date(),
              })
              .where(eq(whatsappTemplates.metaTemplateId, templateStatus.message_template_id))
          } catch (err) {
            log.error({ err }, 'Failed to update template status')
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
