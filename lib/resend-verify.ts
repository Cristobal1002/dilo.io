/**
 * Verifica una API key de Resend contra la API.
 *
 * - Claves «Full access»: GET /domains responde 200.
 * - Claves solo de envío (p. ej. la del onboarding «Send your first email»): GET /domains → 401
 *   `restricted_api_key`. Entonces probamos GET /emails y, si hace falta, POST /emails con cuerpo `{}`:
 *   Resend suele responder 422 por campos faltantes **después** de autenticar — no envía correo.
 *
 * Resend exige `User-Agent` en algunas rutas (403 código 1010 si falta).
 */

const RESEND_UA = 'Dilo/1.0 (+https://getdilo.io)'

type ParsedResendErr = { name?: string; message?: string }

function parseResendErrorBody(text: string): ParsedResendErr {
  try {
    const j = JSON.parse(text) as Record<string, unknown>
    return {
      name: typeof j.name === 'string' ? j.name : undefined,
      message: typeof j.message === 'string' ? j.message : undefined,
    }
  } catch {
    return {}
  }
}

async function resendGet(key: string, path: string): Promise<Response> {
  return fetch(`https://api.resend.com${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'User-Agent': RESEND_UA,
    },
  })
}

/** POST con cuerpo inválido a propósito: si la key es válida, Resend responde error de validación, no 401. */
async function resendPostEmptyEmailProbe(key: string): Promise<{ status: number; text: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': RESEND_UA,
    },
    body: JSON.stringify({}),
  })
  const text = await res.text().catch(() => '')
  return { status: res.status, text }
}

/** La petición pasó autenticación de API key (fallo de negocio / validación, no clave inválida). */
function resendAuthLooksOk(status: number, text: string): boolean {
  const p = parseResendErrorBody(text)
  if (status === 200 || status === 201) return true
  if (status === 422) return true
  if (status === 400) return true
  if (status === 403) {
    if (p.name === 'invalid_api_key') return false
    return true
  }
  if (status === 429) return true
  if (status === 401) return false
  if (status >= 500) return false
  return false
}

const MSG_INVALID =
  'Resend no reconoce la API key (revocada, incompleta o de otra cuenta). Genera una nueva en resend.com/api-keys y copia la cadena completa (empieza por re_).'

const MSG_SENDING_ONLY =
  'Esta clave no permite las comprobaciones que hace Dilo contra la API de Resend. Crea una API key con permiso «Full access» en resend.com/api-keys y vuelve a pegarla.'

export async function verifyResendApiKey(apiKey: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const key = apiKey.trim()
  if (!key) return { ok: false, message: 'API key vacía' }

  try {
    const domainsRes = await resendGet(key, '/domains')
    if (domainsRes.ok) return { ok: true }

    let text = await domainsRes.text().catch(() => '')
    let parsed = parseResendErrorBody(text)
    const restrictedOnDomains =
      domainsRes.status === 401 &&
      (parsed.name === 'restricted_api_key' || /restricted.*only send emails/i.test(parsed.message ?? ''))

    if (restrictedOnDomains) {
      const emailsRes = await resendGet(key, '/emails')
      if (emailsRes.ok) return { ok: true }
      const emailsText = await emailsRes.text().catch(() => '')
      const emailsParsed = parseResendErrorBody(emailsText)
      if (emailsParsed.name === 'invalid_api_key') {
        return { ok: false, message: MSG_INVALID }
      }

      const probe = await resendPostEmptyEmailProbe(key)
      if (resendAuthLooksOk(probe.status, probe.text)) return { ok: true }

      const probeParsed = parseResendErrorBody(probe.text)
      if (probe.status === 401 || (probe.status === 403 && probeParsed.name === 'invalid_api_key')) {
        return { ok: false, message: MSG_INVALID }
      }
      return { ok: false, message: MSG_SENDING_ONLY }
    }

    if (domainsRes.status === 401 || domainsRes.status === 403) {
      if (parsed.name === 'invalid_api_key') {
        return { ok: false, message: MSG_INVALID }
      }
      if (text.includes('1010') || /user-agent/i.test(text)) {
        return {
          ok: false,
          message:
            'Resend rechazó la verificación (a veces por cabeceras). Prueba de nuevo; si sigue fallando, crea una API key «Full access» nueva en resend.com/api-keys.',
        }
      }
      return {
        ok: false,
        message:
          parsed.message?.trim() ||
          'No se pudo validar la API key con Resend. Revisa la clave en el panel de Resend.',
      }
    }

    return { ok: false, message: text.trim() || `Resend respondió ${domainsRes.status}` }
  } catch {
    return { ok: false, message: 'No se pudo contactar a Resend. Intenta de nuevo.' }
  }
}
