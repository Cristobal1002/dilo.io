import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, webhooks } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiNoContent, apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('flows/[flowId]/webhooks/[webhookId]')

const PatchSchema = z.object({
  active: z.boolean(),
})

export const PATCH = withApiHandler(async (req: NextRequest, { auth, params }) => {
  const { org } = auth
  const { flowId, webhookId } = params

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
    columns: { id: true },
  })
  if (!flow) throw new NotFoundError('Flow')

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const existing = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, webhookId), eq(webhooks.flowId, flowId)),
  })
  if (!existing) throw new NotFoundError('Webhook')

  const [row] = await db
    .update(webhooks)
    .set({ active: parsed.data.active })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.flowId, flowId)))
    .returning()

  if (!row) throw new ValidationError('No se pudo actualizar el webhook')

  log.info({ flowId, webhookId, active: row.active }, 'Webhook updated')

  return apiSuccess({
    webhook: {
      id: row.id,
      url: row.url,
      active: row.active,
      createdAt: row.createdAt,
      hasSecret: Boolean(row.secret),
    },
  })
}, { requireAuth: true })

export const DELETE = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const { org } = auth
  const { flowId, webhookId } = params

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
    columns: { id: true },
  })
  if (!flow) throw new NotFoundError('Flow')

  const existing = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, webhookId), eq(webhooks.flowId, flowId)),
    columns: { id: true },
  })
  if (!existing) throw new NotFoundError('Webhook')

  await db.delete(webhooks).where(and(eq(webhooks.id, webhookId), eq(webhooks.flowId, flowId)))

  log.info({ flowId, webhookId }, 'Webhook deleted')

  return apiNoContent()
}, { requireAuth: true })

