import { z } from 'zod'

export const WHATSAPP_VARIABLE_KEYS = [
  'contact.name',
  'contact.phone',
  'contact.email',
  'result.summary',
  'result.classification',
  'result.score',
  'flow.name',
] as const

export type WhatsAppVariableKey = (typeof WHATSAPP_VARIABLE_KEYS)[number]

export const FlowWhatsAppSettingsSchema = z.object({
  enabled: z.boolean(),
  templateName: z.string().max(512).nullable(),
  templateLanguage: z.string().max(10).optional(),
  variableKeys: z.array(z.enum(WHATSAPP_VARIABLE_KEYS)).max(10).optional(),
  minClassification: z.enum(['hot', 'warm']).nullable().optional(),
})

export type FlowWhatsAppSettings = z.infer<typeof FlowWhatsAppSettingsSchema>

const defaults: FlowWhatsAppSettings = {
  enabled: false,
  templateName: null,
  templateLanguage: 'es',
  variableKeys: ['contact.name', 'result.summary'],
  minClassification: null,
}

export function parseFlowWhatsAppSettings(raw: unknown): FlowWhatsAppSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const parsed = FlowWhatsAppSettingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function getFlowWhatsAppSettings(settings: unknown): FlowWhatsAppSettings {
  const wa = parseFlowWhatsAppSettings(
    settings && typeof settings === 'object'
      ? (settings as Record<string, unknown>).whatsapp
      : null,
  )
  return wa ?? { ...defaults }
}

export function resolveWhatsAppVariables(
  keys: WhatsAppVariableKey[],
  ctx: {
    contact: { name?: string; email?: string; phone?: string }
    result: { summary: string; classification: string | null; score: number | null } | null
    flowName: string
  },
): string[] {
  return keys.map((key) => {
    switch (key) {
      case 'contact.name':
        return ctx.contact.name?.trim() || '—'
      case 'contact.phone':
        return ctx.contact.phone?.trim() || '—'
      case 'contact.email':
        return ctx.contact.email?.trim() || '—'
      case 'result.summary':
        return ctx.result?.summary?.trim() || '—'
      case 'result.classification':
        return ctx.result?.classification ?? '—'
      case 'result.score':
        return ctx.result?.score != null ? String(ctx.result.score) : '—'
      case 'flow.name':
        return ctx.flowName
      default:
        return '—'
    }
  })
}

const RANK: Record<string, number> = { hot: 3, warm: 2, cold: 1 }

export function meetsMinClassification(
  classification: string | null,
  min: 'hot' | 'warm' | null | undefined,
): boolean {
  if (!min) return true
  const c = classification ?? 'cold'
  return (RANK[c] ?? 0) >= (RANK[min] ?? 0)
}
