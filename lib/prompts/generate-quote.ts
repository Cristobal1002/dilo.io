import type { SessionQuoteContext } from '@/lib/quotes-from-session'
import { sessionContextToPromptText } from '@/lib/quotes-from-session'

export const QUOTE_GENERATOR_SYSTEM = `Eres un experto en cotizaciones comerciales para servicios digitales y agencias en Colombia.
Generas propuestas en español, con ítems claros, precios en COP (pesos colombianos) salvo que el usuario indique otra moneda.
Usa la información de la sesión del cliente; no inventes datos de contacto que no aparezcan.
Si falta presupuesto explícito, propón ítems razonables según el alcance descrito.
Cada línea debe tener descripción útil para el cliente.
tax_percent: usa 0 salvo IVA aplicable (19 en Colombia si aplica a ese servicio).
Responde solo con el JSON del esquema solicitado.`

export function buildQuoteGeneratorPrompt(args: {
  sessionContext: SessionQuoteContext
  quotePrompt: string | null
  hourlyRateUsd: number | null
}): string {
  const parts = [
    'Contexto de la solicitud del cliente:',
    sessionContextToPromptText(args.sessionContext),
  ]

  if (args.hourlyRateUsd != null && args.hourlyRateUsd > 0) {
    parts.push(`Tarifa de referencia: USD ${args.hourlyRateUsd}/h (convierte a COP si hace falta con tipo de cambio razonable ~4000).`)
  }

  if (args.quotePrompt?.trim()) {
    parts.push('Instrucciones para esta cotización:', args.quotePrompt.trim())
  }

  parts.push(
    'Genera ítems de cotización detallados (desarrollo, diseño, soporte, etc.) acordes al brief. Incluye notas si hay condiciones importantes.',
  )

  return parts.join('\n\n')
}
