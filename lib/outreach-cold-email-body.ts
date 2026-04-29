/**
 * Markdown muy acotado para el cuerpo del cold email de Outreach (sin HTML libre del usuario).
 * - Párrafos: bloques separados por línea en blanco (\n\n).
 * - Negrita: **texto** (sin saltos dentro).
 * - Placeholders: {{recipient}} (primer nombre), {{recipient_full}} (nombre completo).
 */

export const DEFAULT_OUTREACH_COLD_EMAIL_MARKDOWN = `Hola {{recipient}},

¿Tu proceso de discovery con clientes sigue siendo un PDF o un formulario que nadie llena?

Construí Dilo para reemplazar eso con un flow conversacional con IA que en pocos minutos te da un resumen del cliente, su presupuesto y si vale la pena avanzar.

¿Te muestro cómo funciona en 20 minutos esta semana?`

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function substitutePlaceholders(markdown: string, recipientName: string): string {
  const full = recipientName.trim() || 'allí'
  const first = full.split(/\s+/)[0] || full
  return markdown
    .replace(/\{\{\s*recipient\s*\}\}/gi, first)
    .replace(/\{\{\s*recipient_full\s*\}\}/gi, full)
}

/** Convierte un párrafo (sin \n\n internos ya partidos) a HTML: **negrita** y saltos simples → <br/>. */
function paragraphToHtml(p: string): string {
  const chunks = p.split(/(\*\*[^*]+\*\*)/g)
  return chunks
    .map((chunk) => {
      if (/^\*\*[^*]+\*\*$/.test(chunk)) {
        return `<strong>${escapeHtml(chunk.slice(2, -2))}</strong>`
      }
      return escapeHtml(chunk).replace(/\n/g, '<br/>')
    })
    .join('')
}

/**
 * Devuelve fragmento HTML listo para insertar dentro del layout del correo (solo `<p>...</p>`).
 */
export function renderOutreachColdBodyMarkdown(markdown: string, recipientName: string): string {
  const raw = markdown.trim()
  const withNames = substitutePlaceholders(raw, recipientName)
  const blocks = withNames.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  if (blocks.length === 0) {
    return `<p style="margin:0 0 16px 0;">${escapeHtml(recipientName.trim() || 'Hola')}</p>`
  }
  return blocks
    .map((block, i) => {
      const isLast = i === blocks.length - 1
      const marginBottom = isLast ? '24px' : '16px'
      return `<p style="margin:0 0 ${marginBottom} 0;">${paragraphToHtml(block)}</p>`
    })
    .join('')
}
