import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { whatsappMessages } from '@/db/schema'
import { toPhoneE164, toWhatsAppRecipientDigits } from '@/lib/phone-e164'
import { createLogger } from '@/lib/logger'
import { getActiveWhatsAppIntegration } from '@/lib/whatsapp/get-active-integration'
import { metaGraphUrl } from '@/lib/whatsapp/constants'

const log = createLogger('whatsapp/send-template')

export type SendWhatsAppTemplateParams = {
  organizationId: string
  toPhone: string
  templateName: string
  languageCode?: string
  bodyVariables?: string[]
  sessionId?: string
}

export type SendWhatsAppTemplateResult = {
  ok: boolean
  metaMessageId?: string
  skipped?: boolean
  reason?: string
}

export async function sendWhatsAppTemplate(
  params: SendWhatsAppTemplateParams,
): Promise<SendWhatsAppTemplateResult> {
  const integration = await getActiveWhatsAppIntegration(params.organizationId)
  if (!integration) {
    return { ok: false, skipped: true, reason: 'whatsapp_not_connected' }
  }

  const e164 = toPhoneE164(params.toPhone)
  if (!e164) {
    return { ok: false, skipped: true, reason: 'invalid_phone' }
  }

  const languageCode = params.languageCode ?? 'es'
  const bodyVariables = params.bodyVariables ?? []

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to: toWhatsAppRecipientDigits(e164),
    type: 'template',
    template: {
      name: params.templateName,
      language: { code: languageCode },
      components:
        bodyVariables.length > 0
          ? [
              {
                type: 'body',
                parameters: bodyVariables.map((text) => ({ type: 'text', text })),
              },
            ]
          : [],
    },
  }

  const url = metaGraphUrl(`${integration.phoneNumberId}/messages`)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${integration.payload.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as {
    messages?: { id?: string }[]
    error?: { message?: string; code?: number }
  }

  const metaMessageId = data.messages?.[0]?.id
  const failed = !res.ok || Boolean(data.error)

  try {
    await db.insert(whatsappMessages).values({
      organizationId: params.organizationId,
      sessionId: params.sessionId ?? null,
      direction: 'outbound',
      toNumber: e164,
      templateName: params.templateName,
      templateVars: { variables: bodyVariables, languageCode },
      status: failed ? 'failed' : 'sent',
      metaMessageId: metaMessageId ?? null,
      errorCode: data.error?.code != null ? String(data.error.code) : null,
      errorMessage: data.error?.message ?? null,
      rawPayload: data,
    })
  } catch (err) {
    log.error({ err, organizationId: params.organizationId }, 'Failed to log whatsapp_messages row')
  }

  if (failed) {
    log.warn(
      { organizationId: params.organizationId, error: data.error },
      'WhatsApp template send failed',
    )
    return { ok: false, reason: data.error?.message ?? 'send_failed' }
  }

  return { ok: true, metaMessageId }
}

/** Evita duplicar envío al reintentar completion. */
export async function hasOutboundWhatsAppForSession(
  sessionId: string,
  templateName: string,
): Promise<boolean> {
  const row = await db.query.whatsappMessages.findFirst({
    where: and(
      eq(whatsappMessages.sessionId, sessionId),
      eq(whatsappMessages.direction, 'outbound'),
      eq(whatsappMessages.templateName, templateName),
    ),
    columns: { id: true },
  })
  return Boolean(row)
}
