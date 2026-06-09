import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import { PORTAL_SESSION_COOKIE, PORTAL_SESSION_TTL_DAYS } from '@/lib/portal-constants'

type SessionPayload = {
  email: string
  exp: number
}

function sessionSecret(): string {
  return env.CLERK_SECRET_KEY
}

function signPayload(payloadB64: string): string {
  return createHmac('sha256', sessionSecret()).update(payloadB64).digest('base64url')
}

export function createPortalSessionToken(email: string): string {
  const normalizedEmail = email.trim().toLowerCase()
  const exp = Date.now() + PORTAL_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  const payloadB64 = Buffer.from(JSON.stringify({ email: normalizedEmail, exp } satisfies SessionPayload)).toString(
    'base64url',
  )
  return `${payloadB64}.${signPayload(payloadB64)}`
}

export function verifyPortalSessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token?.includes('.')) return null
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null

  const expected = signPayload(payloadB64)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload
    if (!payload.email || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null
    return { email: payload.email.trim().toLowerCase(), exp: payload.exp }
  } catch {
    return null
  }
}

export async function getPortalSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value
  const session = verifyPortalSessionToken(token)
  return session?.email ?? null
}

export function portalSessionCookieOptions(maxAgeSeconds = PORTAL_SESSION_TTL_DAYS * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}
