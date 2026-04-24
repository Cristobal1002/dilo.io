import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq, and, count } from 'drizzle-orm'
import { db } from '@/db'
import { flows, sessions } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('flows/[flowId]')

const SettingsPatchSchema = z
  .object({
    transition_style: z.enum(['ai', 'none']).optional(),
    tone: z.string().max(220).optional(),
    chat_intro: z.string().max(4000).optional(),
    hide_branding: z.boolean().optional(),
  })
  .strict()

const UpdateSchema = z
  .object({
    status: z.enum(['draft', 'published', 'archived']).optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    settings: SettingsPatchSchema.optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.name !== undefined ||
      data.description !== undefined ||
      (data.settings !== undefined && Object.keys(data.settings).length > 0),
    { message: 'Debe proporcionar al menos un campo para actualizar' },
  )

export const PATCH = withApiHandler(async (req: NextRequest, { auth, params }) => {
  const { org } = auth
  const { flowId } = params

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos de actualización inválidos', parsed.error.flatten().fieldErrors)
  }

  const existing = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
  })
  if (!existing) throw new NotFoundError('Flow')

  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  if (parsed.data.name) {
    updateData.name = parsed.data.name
  }

  if (parsed.data.description !== undefined) {
    updateData.description = parsed.data.description ?? null
  }

  if (parsed.data.status) {
    updateData.status = parsed.data.status
    if (parsed.data.status === 'published') {
      updateData.publishedAt = new Date()
    }
  }

  if (parsed.data.settings !== undefined) {
    const cur =
      existing.settings && typeof existing.settings === 'object'
        ? { ...(existing.settings as Record<string, unknown>) }
        : {}
    updateData.settings = { ...cur, ...parsed.data.settings }
  }

  const [updated] = await db
    .update(flows)
    .set(updateData)
    .where(and(eq(flows.id, flowId), eq(flows.organizationId, org.id)))
    .returning()

  if (!updated) throw new NotFoundError('Flow')

  log.info({ flowId, orgId: org.id, changes: Object.keys(updateData) }, 'Flow updated')

  return apiSuccess({ flow: updated })
}, { requireAuth: true })

export const DELETE = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const { org } = auth
  const { flowId } = params

  // Verify the flow belongs to this org before touching anything
  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
    columns: { id: true, name: true },
  })

  if (!flow) throw new NotFoundError('Flow')

  // Count sessions so we can log how much data was removed
  const [{ value: sessionCount }] = await db
    .select({ value: count() })
    .from(sessions)
    .where(eq(sessions.flowId, flowId))

  // Delete flow — ON DELETE CASCADE handles steps, options, sessions, answers,
  // results, webhooks and webhook_deliveries automatically
  await db
    .delete(flows)
    .where(and(eq(flows.id, flowId), eq(flows.organizationId, org.id)))

  log.info({ flowId, orgId: org.id, sessionsDeleted: sessionCount }, 'Flow deleted')

  return apiSuccess({ deleted: true, sessionsDeleted: sessionCount })
}, { requireAuth: true })
