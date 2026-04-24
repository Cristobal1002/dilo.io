/** Flow mínimo para resolver el texto de apertura del chat público. */
export type PublicFlowChatOpeningSource = {
  description: string | null
  settings: unknown
}

/**
 * Texto de la primera burbuja del asistente (antes de la primera pregunta).
 *
 * Prioridad:
 * 1. `settings.chat_intro` si viene rellenado (personalizado en el panel o por la IA).
 * 2. Si hay `description`, saludo corto + descripción + cierre suave.
 * 3. Saludo mínimo según idioma.
 */
export function resolvePublicFlowChatOpening(flow: PublicFlowChatOpeningSource): string {
  const o = flow.settings && typeof flow.settings === 'object' ? (flow.settings as Record<string, unknown>) : {}
  const custom = typeof o.chat_intro === 'string' && o.chat_intro.trim() ? o.chat_intro.trim() : null
  if (custom) return custom

  const desc = (flow.description ?? '').trim()
  const lang = o.language === 'en' ? 'en' : 'es'
  if (desc) {
    if (lang === 'en') {
      return `Hi! 👋 Thanks for being here.\n\n${desc}\n\nWe'll ask a few focused questions, one at a time — whenever you're ready.`
    }
    return `¡Hola! 👋 Gracias por tu tiempo.\n\n${desc}\n\nTe haremos unas preguntas concretas, una a la vez. Vas a tu ritmo.`
  }
  if (lang === 'en') {
    return `Hi! 👋 We'll walk you through a short flow — one question at a time.`
  }
  return `¡Hola! 👋 Te acompañamos en una conversación breve, pregunta a pregunta.`
}
