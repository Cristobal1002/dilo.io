import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orgIntegrationCredentials } from '@/db/schema'
import { decryptIntegrationPayload } from '@/lib/integration-crypto'
import { createLogger } from '@/lib/logger'

const log = createLogger('email/org-resend')

const RESEND_PROVIDER = 'resend' as const

export type ResolvedResendConfig = {
  apiKey: string
  /** Dirección para el campo `from` (solo email, sin nombre para mostrar). */
  from: string
  /** Origen para logs/métricas. */
  source: 'org_integration' | 'env'
}

/**
 * API key + remitente para enviar con Resend:
 * 1) Integración del workspace (Integraciones → Resend), si hay fila con key y `fromEmail`.
 * 2) Variables de entorno `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (comportamiento anterior).
 */
export async function resolveResendSendConfig(organizationId: string): Promise<ResolvedResendConfig | null> {
  const row = await db.query.orgIntegrationCredentials.findFirst({
    where: and(
      eq(orgIntegrationCredentials.organizationId, organizationId),
      eq(orgIntegrationCredentials.provider, RESEND_PROVIDER),
    ),
  })

  if (row) {
    try {
      const dec = decryptIntegrationPayload(row.encryptedPayload)
      const key = dec.apiKey?.trim()
      const from = dec.fromEmail?.trim()
      if (key && from) {
        return { apiKey: key, from, source: 'org_integration' }
      }
      log.warn({ organizationId }, 'Resend integration incompleta (falta API key o email remitente en ajustes)')
    } catch (err) {
      log.warn({ err, organizationId }, 'No se pudieron descifrar credenciales Resend del workspace')
    }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (apiKey && from) {
    return { apiKey, from, source: 'env' }
  }

  return null
}
