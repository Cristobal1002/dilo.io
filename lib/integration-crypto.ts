import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import type { ResendIntegrationPayload, WhatsAppIntegrationPayload } from '@/lib/integration-payloads'

export type { ResendIntegrationPayload, WhatsAppIntegrationPayload } from '@/lib/integration-payloads'

const ALGO = 'aes-256-gcm'
const VERSION = 'v1'

function deriveKey(): Buffer {
  const raw = process.env.DILO_INTEGRATION_SECRETS_KEY
  if (!raw?.trim()) {
    throw new Error('MISSING_DILO_INTEGRATION_SECRETS_KEY')
  }
  return createHash('sha256').update(raw, 'utf8').digest()
}

function encryptJson(plain: string): string {
  const key = deriveKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join(':')
}

function decryptJson(blob: string): string {
  const key = deriveKey()
  const parts = blob.split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('INVALID_INTEGRATION_BLOB')
  }
  const [, ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64url')
  const tag = Buffer.from(tagB64, 'base64url')
  const data = Buffer.from(dataB64, 'base64url')
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function encryptResendPayload(payload: ResendIntegrationPayload): string {
  return encryptJson(JSON.stringify(payload))
}

export function decryptResendPayload(blob: string): ResendIntegrationPayload {
  const parsed = JSON.parse(decryptJson(blob)) as unknown
  if (!parsed || typeof parsed !== 'object' || typeof (parsed as { apiKey?: unknown }).apiKey !== 'string') {
    throw new Error('INVALID_INTEGRATION_PAYLOAD')
  }
  const o = parsed as { apiKey: string; fromEmail?: string | null }
  return { apiKey: o.apiKey, fromEmail: o.fromEmail ?? null }
}

export function encryptWhatsAppPayload(payload: WhatsAppIntegrationPayload): string {
  return encryptJson(JSON.stringify(payload))
}

export function decryptWhatsAppPayload(blob: string): WhatsAppIntegrationPayload {
  const parsed = JSON.parse(decryptJson(blob)) as unknown
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { accessToken?: unknown }).accessToken !== 'string'
  ) {
    throw new Error('INVALID_INTEGRATION_PAYLOAD')
  }
  const o = parsed as { accessToken: string; tokenType?: string | null }
  return { accessToken: o.accessToken, tokenType: o.tokenType ?? null }
}

/** @deprecated Usar encryptResendPayload */
export function encryptIntegrationPayload(payload: ResendIntegrationPayload): string {
  return encryptResendPayload(payload)
}

/** @deprecated Usar decryptResendPayload */
export function decryptIntegrationPayload(blob: string): ResendIntegrationPayload {
  return decryptResendPayload(blob)
}

export function apiKeyLast4(apiKey: string): string {
  const t = apiKey.trim()
  if (t.length <= 4) return '****'
  return t.slice(-4)
}

export function tokenLast4(token: string): string {
  return apiKeyLast4(token)
}
