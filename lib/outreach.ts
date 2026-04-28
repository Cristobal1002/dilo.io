import { randomBytes } from 'crypto'

export const OUTREACH_STATUSES = [
  'pending',
  'sent',
  'opened',
  'clicked',
  'replied',
  'meeting',
  'closed',
  'lost',
] as const

export type OutreachStatus = (typeof OUTREACH_STATUSES)[number]

/** Valores del filtro en dashboard/API (`all` + cada status). */
export const OUTREACH_FILTER_STATUSES = ['all', ...OUTREACH_STATUSES] as const

export type OutreachFilterStatus = (typeof OUTREACH_FILTER_STATUSES)[number]

/** No sobrescribir con eventos automáticos (apertura/clic). */
export const OUTREACH_MANUAL_PRIORITY_STATUSES: ReadonlySet<OutreachStatus> = new Set([
  'replied',
  'meeting',
  'closed',
  'lost',
])

export function isOutreachStatus(s: string): s is OutreachStatus {
  return OUTREACH_STATUSES.includes(s as OutreachStatus)
}

export function normalizeLeadEmailKey(email: string): string {
  return email.trim().toLowerCase()
}

export function newOutreachTrackingToken(): string {
  return randomBytes(20).toString('base64url')
}

/** Tras pixel: solo desde `sent`. */
export function autoStatusAfterOpen(current: string): OutreachStatus | null {
  if (!isOutreachStatus(current)) return null
  if (OUTREACH_MANUAL_PRIORITY_STATUSES.has(current)) return null
  if (current === 'sent') return 'opened'
  return null
}

/** Tras clic: desde `sent` u `opened`. */
export function autoStatusAfterClick(current: string): OutreachStatus | null {
  if (!isOutreachStatus(current)) return null
  if (OUTREACH_MANUAL_PRIORITY_STATUSES.has(current)) return null
  if (current === 'sent' || current === 'opened') return 'clicked'
  return null
}

export function publicAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''
  if (raw) return raw
  return 'http://localhost:3000'
}

export function buildOpenPixelUrl(token: string): string {
  return `${publicAppBaseUrl()}/api/track/o/${encodeURIComponent(token)}`
}

export function buildTrackedClickUrl(token: string, destinationUrl: string): string {
  return `${publicAppBaseUrl()}/api/track/c/${encodeURIComponent(token)}?url=${encodeURIComponent(destinationUrl)}`
}

/**
 * Evita open redirect: solo https (o http en localhost).
 *
 * Nota: permitimos cualquier host en https para que el CTA pueda ser Calendly,
 * LinkedIn, etc. Si más adelante quieres endurecer, añade allowlist por org.
 */
export function isAllowedTrackingRedirectUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    if (u.protocol === 'https:') return true
    if (u.protocol === 'http:') {
      const host = u.hostname.toLowerCase()
      return host === 'localhost' || host === '127.0.0.1'
    }
    return false
  } catch {
    return false
  }
}

/** `emailKey` único al archivar (libera el índice para un lead nuevo con el mismo email). */
export function archivedLeadEmailKey(leadId: string): string {
  return `__archived__${leadId}@dilo.invalid`
}
