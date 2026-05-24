import { metaGraphUrl } from '@/lib/whatsapp/constants'
import { requireMetaEnv } from '@/lib/whatsapp/meta-env'

export type ExchangeCodeResult = {
  accessToken: string
  tokenType?: string
  expiresIn?: number
}

export async function exchangeEmbeddedSignupCode(code: string): Promise<ExchangeCodeResult> {
  const { appId, appSecret } = requireMetaEnv()
  const url = new URL(metaGraphUrl('oauth/access_token'))
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('code', code)

  const res = await fetch(url.toString())
  const data = (await res.json()) as {
    access_token?: string
    token_type?: string
    expires_in?: number
    error?: { message?: string }
  }

  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? 'No se pudo intercambiar el código de Meta')
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
  }
}

/** Obtiene display_phone_number si no vino del cliente. */
export async function fetchDisplayPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
): Promise<string | null> {
  const url = metaGraphUrl(phoneNumberId)
  const res = await fetch(`${url}?fields=display_phone_number`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await res.json()) as { display_phone_number?: string; error?: { message?: string } }
  if (!res.ok) return null
  return data.display_phone_number?.trim() || null
}
