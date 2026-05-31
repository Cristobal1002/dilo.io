import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { signEmbedContext } from '@/lib/embed-context'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { resolveClientForEmbed } from '@/lib/support-clients'
import { withApiHandler } from '@/lib/with-api-handler'

const BodySchema = z
  .object({
    flowId: z.string().uuid(),
    clientId: z.string().uuid().optional(),
    externalId: z.string().trim().min(1).max(120).optional(),
    ttlSeconds: z.number().int().min(60).max(86400).optional(),
  })
  .refine((d) => d.clientId || d.externalId, {
    message: 'Indica clientId o externalId',
  })

/**
 * Emite token firmado para embed contextual (dashboard multi-tenant del partner).
 */
export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin', 'member'])

  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, parsed.data.flowId), eq(flows.organizationId, auth.org.id)),
    columns: { id: true, status: true },
  })
  if (!flow) throw new NotFoundError('Flow')
  if (flow.status !== 'published') {
    throw new ValidationError('Publica el flow antes de generar contexto embed')
  }

  const client = await resolveClientForEmbed({
    organizationId: auth.org.id,
    clientId: parsed.data.clientId,
    externalId: parsed.data.externalId,
  })
  if (!client) throw new NotFoundError('Cliente')

  const signed = signEmbedContext({
    flowId: flow.id,
    clientId: client.id,
    ttlSeconds: parsed.data.ttlSeconds,
  })

  return apiSuccess({
    token: signed.token,
    expiresAt: signed.expiresAt,
    client: { id: client.id, name: client.name, externalId: client.externalId },
    flowId: flow.id,
  })
}, { requireAuth: true })
