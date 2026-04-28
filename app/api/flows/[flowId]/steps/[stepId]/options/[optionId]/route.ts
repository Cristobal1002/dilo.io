import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, asc, count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, steps, stepOptions } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiNoContent, apiSuccess } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('flows/[flowId]/steps/[stepId]/options/[optionId]')

const UpdateOptionSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  emoji: z.string().max(10).nullable().optional(),
})

function labelToValue(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100) || 'opcion'
}

async function verifyOwnership(flowId: string, stepId: string, optionId: string, orgId: string) {
  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, orgId)),
  })
  if (!flow) throw new NotFoundError('Flow')

  const step = await db.query.steps.findFirst({
    where: and(eq(steps.id, stepId), eq(steps.flowId, flowId)),
  })
  if (!step) throw new NotFoundError('Paso')

  const option = await db.query.stepOptions.findFirst({
    where: and(eq(stepOptions.id, optionId), eq(stepOptions.stepId, stepId)),
  })
  if (!option) throw new NotFoundError('Opción')

  return option
}

export const PATCH = withApiHandler(
  async (req: NextRequest, { auth, params }) => {
    const { org } = auth
    const { flowId, stepId, optionId } = params

    const body = await req.json()
    const parsed = UpdateOptionSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
    }

    await verifyOwnership(flowId, stepId, optionId, org.id)

    const updateData: Record<string, unknown> = {}
    if (parsed.data.label !== undefined) {
      updateData.label = parsed.data.label
      updateData.value = labelToValue(parsed.data.label)
    }
    if (parsed.data.emoji !== undefined) updateData.emoji = parsed.data.emoji

    const [updated] = await db
      .update(stepOptions)
      .set(updateData)
      .where(eq(stepOptions.id, optionId))
      .returning()

    log.info({ optionId, changes: Object.keys(updateData) }, 'Option updated')

    return apiSuccess({ option: updated })
  },
  { requireAuth: true },
)

export const DELETE = withApiHandler(
  async (_req: NextRequest, { auth, params }) => {
    const { org } = auth
    const { flowId, stepId, optionId } = params

    const option = await verifyOwnership(flowId, stepId, optionId, org.id)

    const step = await db.query.steps.findFirst({
      where: and(eq(steps.id, stepId), eq(steps.flowId, flowId)),
    })
    if (step && (step.type === 'select' || step.type === 'multi_select')) {
      const [cntRow] = await db
        .select({ c: count() })
        .from(stepOptions)
        .where(eq(stepOptions.stepId, stepId))
      const total = cntRow?.c ?? 0
      if (total <= 1) {
        throw new ValidationError(
          'Una pregunta de selección debe tener al menos una opción. Añade otra opción antes de borrar esta.',
        )
      }
    }

    await db.delete(stepOptions).where(eq(stepOptions.id, optionId))

    // Renormalize order for remaining options
    const remaining = await db.query.stepOptions.findMany({
      where: eq(stepOptions.stepId, stepId),
      orderBy: asc(stepOptions.order),
    })
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await db.update(stepOptions).set({ order: i }).where(eq(stepOptions.id, remaining[i].id))
      }
    }

    log.info({ optionId, stepId, deletedOrder: option.order }, 'Option deleted')

    return apiNoContent()
  },
  { requireAuth: true },
)
