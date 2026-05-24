import { createLogger } from '@/lib/logger'
import {
  getFlowWhatsAppSettings,
  meetsMinClassification,
  resolveWhatsAppVariables,
} from '@/lib/whatsapp/flow-settings'
import { getActiveWhatsAppIntegration } from '@/lib/whatsapp/get-active-integration'
import { hasOutboundWhatsAppForSession, sendWhatsAppTemplate } from '@/lib/whatsapp/send-template'

const log = createLogger('whatsapp/on-session-complete')

export async function sendWhatsAppOnSessionComplete(args: {
  organizationId: string
  flowId: string
  flowName: string
  sessionId: string
  flowSettings: unknown
  contact: { name?: string; email?: string; phone?: string }
  result: {
    summary: string
    classification: string | null
    score: number | null
  } | null
}): Promise<void> {
  const wa = getFlowWhatsAppSettings(args.flowSettings)
  if (!wa.enabled || !wa.templateName?.trim()) return

  if (!meetsMinClassification(args.result?.classification ?? null, wa.minClassification)) {
    log.info({ sessionId: args.sessionId }, 'WhatsApp skipped: classification filter')
    return
  }

  if (!args.contact.phone?.trim()) {
    log.info({ sessionId: args.sessionId }, 'WhatsApp skipped: no phone on session')
    return
  }

  const integration = await getActiveWhatsAppIntegration(args.organizationId)
  if (!integration) {
    log.info({ organizationId: args.organizationId }, 'WhatsApp skipped: workspace not connected')
    return
  }

  const templateName = wa.templateName.trim()
  if (await hasOutboundWhatsAppForSession(args.sessionId, templateName)) {
    log.info({ sessionId: args.sessionId, templateName }, 'WhatsApp skipped: already sent')
    return
  }

  const variableKeys = wa.variableKeys ?? ['contact.name', 'result.summary']
  const bodyVariables = resolveWhatsAppVariables(variableKeys, {
    contact: args.contact,
    result: args.result,
    flowName: args.flowName,
  })

  const result = await sendWhatsAppTemplate({
    organizationId: args.organizationId,
    toPhone: args.contact.phone,
    templateName,
    languageCode: wa.templateLanguage ?? 'es',
    bodyVariables,
    sessionId: args.sessionId,
  })

  if (!result.ok && !result.skipped) {
    log.warn({ sessionId: args.sessionId, reason: result.reason }, 'WhatsApp on complete failed')
  }
}
