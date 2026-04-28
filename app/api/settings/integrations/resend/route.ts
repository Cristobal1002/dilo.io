import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orgIntegrationCredentials } from '@/db/schema'
import { apiNoContent, apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import {
  apiKeyLast4,
  decryptIntegrationPayload,
  encryptIntegrationPayload,
} from '@/lib/integration-crypto'
import { requireOrgRoles } from '@/lib/org-role'
import { verifyResendApiKey } from '@/lib/resend-verify'
import { withApiHandler } from '@/lib/with-api-handler'

const RESEND = 'resend' as const

const PatchBody = z.object({
  apiKey: z.string().trim().min(8).max(256),
  fromEmail: z.string().trim().email().max(320).optional().nullable(),
})

export const GET = withApiHandler(async (_req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  const row = await db.query.orgIntegrationCredentials.findFirst({
    where: and(
      eq(orgIntegrationCredentials.organizationId, auth.org.id),
      eq(orgIntegrationCredentials.provider, RESEND),
    ),
  })

  if (!row) {
    return apiSuccess({
      connected: false,
      fromEmail: null as string | null,
      apiKeyLast4: null as string | null,
    })
  }

  try {
    const dec = decryptIntegrationPayload(row.encryptedPayload)
    return apiSuccess({
      connected: true,
      fromEmail: dec.fromEmail ?? null,
      apiKeyLast4: apiKeyLast4(dec.apiKey),
    })
  } catch {
    return apiSuccess({
      connected: true,
      corrupt: true,
      fromEmail: null as string | null,
      apiKeyLast4: null as string | null,
    })
  }
}, { requireAuth: true })

export const PATCH = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  const body = await req.json()
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const fromEmail =
    parsed.data.fromEmail && parsed.data.fromEmail.trim() ? parsed.data.fromEmail.trim() : null

  const check = await verifyResendApiKey(parsed.data.apiKey)
  if (!check.ok) {
    throw new ValidationError(check.message)
  }

  let encrypted: string
  try {
    encrypted = encryptIntegrationPayload({ apiKey: parsed.data.apiKey.trim(), fromEmail })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'MISSING_DILO_INTEGRATION_SECRETS_KEY') {
      throw new ValidationError(
        'Falta la variable de entorno DILO_INTEGRATION_SECRETS_KEY en el servidor (clave para cifrar credenciales).',
      )
    }
    throw new ValidationError('No se pudo cifrar la credencial. Revisa la configuración del servidor.')
  }

  const now = new Date()
  const existing = await db.query.orgIntegrationCredentials.findFirst({
    where: and(
      eq(orgIntegrationCredentials.organizationId, auth.org.id),
      eq(orgIntegrationCredentials.provider, RESEND),
    ),
  })

  if (existing) {
    await db
      .update(orgIntegrationCredentials)
      .set({ encryptedPayload: encrypted, updatedAt: now })
      .where(eq(orgIntegrationCredentials.id, existing.id))
  } else {
    await db.insert(orgIntegrationCredentials).values({
      organizationId: auth.org.id,
      provider: RESEND,
      encryptedPayload: encrypted,
      createdAt: now,
      updatedAt: now,
    })
  }

  return apiSuccess({
    connected: true,
    fromEmail,
    apiKeyLast4: apiKeyLast4(parsed.data.apiKey.trim()),
  })
}, { requireAuth: true })

export const DELETE = withApiHandler(async (_req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  await db
    .delete(orgIntegrationCredentials)
    .where(
      and(
        eq(orgIntegrationCredentials.organizationId, auth.org.id),
        eq(orgIntegrationCredentials.provider, RESEND),
      ),
    )

  return apiNoContent()
}, { requireAuth: true })
