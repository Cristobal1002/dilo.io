import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orgIntegrationCredentials } from '@/db/schema'
import { apiNoContent, apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { encryptWhatsAppPayload } from '@/lib/integration-crypto'
import { requireOrgRoles } from '@/lib/org-role'
import { rethrowUnlessMissingRelation } from '@/lib/pg-relation-errors'
import { exchangeEmbeddedSignupCode, fetchDisplayPhoneNumber } from '@/lib/whatsapp/connect'
import { WHATSAPP_PROVIDER } from '@/lib/whatsapp/constants'
import { getMetaEnv } from '@/lib/whatsapp/meta-env'
import { withApiHandler } from '@/lib/with-api-handler'

const INTEGRATIONS_TABLE = 'org_integration_credentials'

const ConnectBody = z.object({
  code: z.string().min(1).max(4096),
  wabaId: z.string().min(1).max(128),
  phoneNumberId: z.string().min(1).max(128),
  displayPhone: z.string().max(64).optional().nullable(),
})

export const GET = withApiHandler(async (_req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  const metaConfigured = Boolean(getMetaEnv())

  let row
  try {
    row = await db.query.orgIntegrationCredentials.findFirst({
      where: and(
        eq(orgIntegrationCredentials.organizationId, auth.org.id),
        eq(orgIntegrationCredentials.provider, WHATSAPP_PROVIDER),
      ),
    })
  } catch (err) {
    rethrowUnlessMissingRelation(err, INTEGRATIONS_TABLE)
  }

  if (!row || row.status === 'disconnected') {
    return apiSuccess({
      connected: false,
      sendReady: false,
      metaConfigured,
      displayPhone: null as string | null,
      wabaId: null as string | null,
      phoneNumberId: null as string | null,
      status: row?.status ?? null,
      lastError: row?.lastError ?? null,
    })
  }

  const sendReady = row.status === 'active' && Boolean(row.phoneNumberId)

  return apiSuccess({
    connected: true,
    sendReady,
    metaConfigured,
    displayPhone: row.displayPhone,
    wabaId: row.wabaId,
    phoneNumberId: row.phoneNumberId,
    status: row.status,
    lastError: row.lastError,
  })
}, { requireAuth: true })

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  if (!getMetaEnv()) {
    throw new ValidationError(
      'WhatsApp no está configurado en el servidor (FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, WHATSAPP_WEBHOOK_VERIFY_TOKEN, NEXT_PUBLIC_FACEBOOK_CONFIG_ID).',
    )
  }

  const body = await req.json()
  const parsed = ConnectBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  let tokenResult
  try {
    tokenResult = await exchangeEmbeddedSignupCode(parsed.data.code)
  } catch (e) {
    throw new ValidationError(e instanceof Error ? e.message : 'Error al conectar con Meta')
  }

  let displayPhone = parsed.data.displayPhone?.trim() || null
  if (!displayPhone) {
    displayPhone = await fetchDisplayPhoneNumber(parsed.data.phoneNumberId, tokenResult.accessToken)
  }

  let encrypted: string
  try {
    encrypted = encryptWhatsAppPayload({
      accessToken: tokenResult.accessToken,
      tokenType: tokenResult.tokenType ?? null,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'MISSING_DILO_INTEGRATION_SECRETS_KEY') {
      throw new ValidationError(
        'Falta DILO_INTEGRATION_SECRETS_KEY en el servidor (cifrado de credenciales).',
      )
    }
    throw new ValidationError('No se pudo cifrar el token de WhatsApp.')
  }

  const now = new Date()
  const tokenExpiresAt =
    tokenResult.expiresIn != null ? new Date(now.getTime() + tokenResult.expiresIn * 1000) : null

  try {
    const existing = await db.query.orgIntegrationCredentials.findFirst({
      where: and(
        eq(orgIntegrationCredentials.organizationId, auth.org.id),
        eq(orgIntegrationCredentials.provider, WHATSAPP_PROVIDER),
      ),
    })

    const values = {
      encryptedPayload: encrypted,
      phoneNumberId: parsed.data.phoneNumberId,
      wabaId: parsed.data.wabaId,
      displayPhone,
      status: 'active' as const,
      tokenExpiresAt,
      lastError: null as string | null,
      updatedAt: now,
    }

    if (existing) {
      await db
        .update(orgIntegrationCredentials)
        .set(values)
        .where(eq(orgIntegrationCredentials.id, existing.id))
    } else {
      await db.insert(orgIntegrationCredentials).values({
        organizationId: auth.org.id,
        provider: WHATSAPP_PROVIDER,
        encryptedPayload: encrypted,
        phoneNumberId: parsed.data.phoneNumberId,
        wabaId: parsed.data.wabaId,
        displayPhone,
        status: 'active',
        tokenExpiresAt,
        createdAt: now,
        updatedAt: now,
      })
    }
  } catch (err) {
    rethrowUnlessMissingRelation(err, INTEGRATIONS_TABLE)
  }

  return apiSuccess({
    connected: true,
    sendReady: true,
    displayPhone,
    wabaId: parsed.data.wabaId,
    phoneNumberId: parsed.data.phoneNumberId,
  })
}, { requireAuth: true })

export const DELETE = withApiHandler(async (_req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  try {
    await db
      .delete(orgIntegrationCredentials)
      .where(
        and(
          eq(orgIntegrationCredentials.organizationId, auth.org.id),
          eq(orgIntegrationCredentials.provider, WHATSAPP_PROVIDER),
        ),
      )
  } catch (err) {
    rethrowUnlessMissingRelation(err, INTEGRATIONS_TABLE)
  }

  return apiNoContent()
}, { requireAuth: true })
