/**
 * Resend webhooks — actualiza estado de entrega / bounce en `outreach_emails`.
 *
 * Configuración (Resend Dashboard → Webhooks):
 *   URL: https://<tu-dominio>/api/webhooks/resend
 *   Eventos: email.sent, email.delivered, email.bounced, email.complained, email.failed, email.delivery_delayed
 *   Signing secret → RESEND_WEBHOOK_SECRET en .env (formato whsec_…)
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { Webhook } from 'svix'
import { db } from '@/db'
import { outreachEmails } from '@/db/schema'
import { createLogger } from '@/lib/logger'

const log = createLogger('webhooks/resend')

type ResendWebhookEvent = {
  type: string
  created_at?: string
  data?: {
    email_id?: string
    bounce?: {
      message?: string
      subType?: string
      type?: string
    }
  }
}

function mapEventToStatus(eventType: string): string | null {
  switch (eventType) {
    case 'email.sent':
      return 'sent'
    case 'email.delivered':
      return 'delivered'
    case 'email.bounced':
      return 'bounced'
    case 'email.complained':
      return 'complained'
    case 'email.failed':
      return 'failed'
    case 'email.delivery_delayed':
      return 'delayed'
    default:
      return null
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (!secret) {
    log.warn({}, 'RESEND_WEBHOOK_SECRET no configurado; webhook ignorado')
    return NextResponse.json({ ok: true, skipped: true })
  }

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Faltan cabeceras svix' }, { status: 400 })
  }

  const payload = await req.text()

  let event: ResendWebhookEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendWebhookEvent
  } catch (err) {
    log.warn({ err }, 'Firma de webhook Resend inválida')
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  const emailId = event.data?.email_id?.trim()
  if (!emailId) {
    return NextResponse.json({ ok: true })
  }

  const deliveryStatus = mapEventToStatus(event.type)
  if (!deliveryStatus) {
    return NextResponse.json({ ok: true })
  }

  const now = new Date()
  const bounce = event.data?.bounce

  try {
    if (event.type === 'email.bounced') {
      const [row] = await db
        .update(outreachEmails)
        .set({
          resendDeliveryStatus: deliveryStatus,
          resendDeliveryUpdatedAt: now,
          resendBounceType: bounce?.type?.trim() || bounce?.subType?.trim() || null,
          resendBounceMessage: bounce?.message?.trim() || null,
        })
        .where(eq(outreachEmails.resendEmailId, emailId))
        .returning({ id: outreachEmails.id })
      if (!row) {
        log.info({ emailId, type: event.type }, 'Webhook Resend: sin fila outreach_emails con ese resend_email_id')
      }
    } else {
      const [row] = await db
        .update(outreachEmails)
        .set({
          resendDeliveryStatus: deliveryStatus,
          resendDeliveryUpdatedAt: now,
          resendBounceType: null,
          resendBounceMessage: null,
        })
        .where(eq(outreachEmails.resendEmailId, emailId))
        .returning({ id: outreachEmails.id })
      if (!row) {
        log.info({ emailId, type: event.type }, 'Webhook Resend: sin fila outreach_emails con ese resend_email_id')
      }
    }
  } catch (err) {
    log.error({ err, emailId, type: event.type }, 'Error actualizando outreach_emails desde webhook Resend')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
