import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orgIntegrationCredentials } from '@/db/schema'
import { decryptWhatsAppPayload } from '@/lib/integration-crypto'
import type { WhatsAppIntegrationPayload } from '@/lib/integration-payloads'
import { WHATSAPP_PROVIDER } from '@/lib/whatsapp/constants'

export type ActiveWhatsAppIntegration = {
  id: string
  organizationId: string
  phoneNumberId: string
  wabaId: string | null
  displayPhone: string | null
  payload: WhatsAppIntegrationPayload
}

export async function getActiveWhatsAppIntegration(
  organizationId: string,
): Promise<ActiveWhatsAppIntegration | null> {
  const row = await db.query.orgIntegrationCredentials.findFirst({
    where: and(
      eq(orgIntegrationCredentials.organizationId, organizationId),
      eq(orgIntegrationCredentials.provider, WHATSAPP_PROVIDER),
      eq(orgIntegrationCredentials.status, 'active'),
    ),
  })
  if (!row?.phoneNumberId) return null
  try {
    const payload = decryptWhatsAppPayload(row.encryptedPayload)
    if (!payload.accessToken?.trim()) return null
    return {
      id: row.id,
      organizationId: row.organizationId,
      phoneNumberId: row.phoneNumberId,
      wabaId: row.wabaId,
      displayPhone: row.displayPhone,
      payload,
    }
  } catch {
    return null
  }
}

export async function findOrgByWhatsAppPhoneNumberId(
  phoneNumberId: string,
): Promise<{ organizationId: string; integrationId: string } | null> {
  const row = await db.query.orgIntegrationCredentials.findFirst({
    where: and(
      eq(orgIntegrationCredentials.provider, WHATSAPP_PROVIDER),
      eq(orgIntegrationCredentials.phoneNumberId, phoneNumberId),
      eq(orgIntegrationCredentials.status, 'active'),
    ),
    columns: { id: true, organizationId: true },
  })
  if (!row) return null
  return { organizationId: row.organizationId, integrationId: row.id }
}
