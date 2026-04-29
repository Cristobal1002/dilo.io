/**
 * Verifica una API key de Resend contra la API.
 *
 * - Claves «Full access»: GET /domains responde 200.
 * - Claves solo de envío: GET /domains devuelve 401 `restricted_api_key`; probamos GET /emails.
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

const MSG_INVALID =
  'Resend no reconoce la API key (revocada, incompleta o de otra cuenta). Genera una nueva en resend.com/api-keys y copia la cadena completa (empieza por re_).'

const MSG_SENDING_ONLY =
  'Esta clave es solo de envío y Resend no permite validarla con las rutas que usamos. Crea una API key con permiso «Full access» en resend.com/api-keys y vuelve a pegarla.'

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
      text = await emailsRes.text().catch(() => '')
      parsed = parseResendErrorBody(text)
      if (parsed.name === 'invalid_api_key' || emailsRes.status === 403) {
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
