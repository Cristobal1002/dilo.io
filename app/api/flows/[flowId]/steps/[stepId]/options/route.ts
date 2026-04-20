import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq, max } from 'drizzle-orm'
import { db } from '@/db'
import { flows, steps, stepOptions } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiCreated } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('flows/[flowId]/steps/[stepId]/options')

const CreateOptionSchema = z.object({
  label: z.string().min(1).max(200),
  emoji: z.string().max(10).nullable().optional(),
})

/** Convierte un label en un valor slug snake_case */
function labelToValue(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100) || 'opcion'
}

export const POST = withApiHandler(
  async (req: NextRequest, { auth, params }) => {
    const { org } = auth
    const { flowId, stepId } = params

    const body = await req.json()
    const parsed = CreateOptionSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Datos de opción inválidos', parsed.error.flatten().fieldErrors)
    }

    // Verify ownership: flow → org
    const flow = await db.query.flows.findFirst({
      where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
    })
    if (!flow) throw new NotFoundError('Flow')

    const step = await db.query.steps.findFirst({
      where: and(eq(steps.id, stepId), eq(steps.flowId, flowId)),
    })
    if (!step) throw new NotFoundError('Paso')

    // Auto-increment order
    const [agg] = await db
      .select({ maxOrder: max(stepOptions.order) })
      .from(stepOptions)
      .where(eq(stepOptions.stepId, stepId))

    const order = (agg?.maxOrder ?? -1) + 1
    const value = labelToValue(parsed.data.label)

    const [created] = await db
      .insert(stepOptions)
      .values({
        stepId,
        label: parsed.data.label,
        value,
        emoji: parsed.data.emoji ?? null,
        order,
      })
      .returning()

    log.info({ stepId, optionId: created.id, order }, 'Option created')

    return apiCreated({ option: created })
  },
  { requireAuth: true },
)
