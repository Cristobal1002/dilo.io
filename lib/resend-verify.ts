/**
 * Verifica una API key de Resend llamando a la API (listado de dominios).
 */
export async function verifyResendApiKey(apiKey: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const key = apiKey.trim()
  if (!key) return { ok: false, message: 'API key vacía' }

  try {
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    })
    if (res.ok) return { ok: true }
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'API key inválida o sin permisos' }
    }
    return { ok: false, message: text || `Resend respondió ${res.status}` }
  } catch {
    return { ok: false, message: 'No se pudo contactar a Resend. Intenta de nuevo.' }
  }
}
