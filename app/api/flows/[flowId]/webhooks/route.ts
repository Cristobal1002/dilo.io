import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, webhooks } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiCreated, apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('flows/[flowId]/webhooks')

const CreateWebhookSchema = z.object({
  url: z.string().url('URL inválida'),
  secret: z.string().max(512).nullable().optional(),
})

export const GET = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const { org } = auth
  const { flowId } = params

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
  })
  if (!flow) throw new NotFoundError('Flow')

  const rows = await db.query.webhooks.findMany({
    where: eq(webhooks.flowId, flowId),
    orderBy: [desc(webhooks.createdAt)],
  })

  return apiSuccess({
    webhooks: rows.map((w) => ({
      id: w.id,
      url: w.url,
      active: w.active,
      createdAt: w.createdAt,
      hasSecret: Boolean(w.secret),
    })),
  })
}, { requireAuth: true })

export const POST = withApiHandler(async (req: NextRequest, { auth, params }) => {
  const { org } = auth
  const { flowId } = params

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
  })
  if (!flow) throw new NotFoundError('Flow')

  const body = await req.json()
  const parsed = CreateWebhookSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const [row] = await db
    .insert(webhooks)
    .values({
      flowId,
      url: parsed.data.url,
      secret: parsed.data.secret ?? null,
      active: true,
    })
    .returning()

  if (!row) throw new ValidationError('No se pudo crear el webhook')

  log.info({ flowId, webhookId: row.id }, 'Webhook created')

  return apiCreated({
    webhook: {
      id: row.id,
      url: row.url,
      active: row.active,
      createdAt: row.createdAt,
      hasSecret: Boolean(row.secret),
    },
  })
}, { requireAuth: true })
