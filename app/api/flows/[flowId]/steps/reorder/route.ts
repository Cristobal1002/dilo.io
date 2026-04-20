import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { flows, steps } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiNoContent } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('flows/[flowId]/steps/reorder')

const ReorderSchema = z.object({
  /** IDs de pasos en el nuevo orden deseado (0-indexed). */
  stepIds: z.array(z.string().uuid()).min(1).max(200),
})

export const POST = withApiHandler(
  async (req: NextRequest, { auth, params }) => {
    const { org } = auth
    const { flowId } = params

    const body = await req.json()
    const parsed = ReorderSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Lista de pasos inválida', parsed.error.flatten().fieldErrors)
    }

    // Verify flow ownership
    const flow = await db.query.flows.findFirst({
      where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
    })
    if (!flow) throw new NotFoundError('Flow')

    const { stepIds } = parsed.data

    // Verify all IDs belong to this flow
    const existing = await db.query.steps.findMany({
      where: and(eq(steps.flowId, flowId), inArray(steps.id, stepIds)),
    })
    if (existing.length !== stepIds.length) {
      throw new ValidationError('Algunos pasos no pertenecen a este flow')
    }

    // Update each step's order to match the new position
    for (let i = 0; i < stepIds.length; i++) {
      await db.update(steps).set({ order: i }).where(eq(steps.id, stepIds[i]))
    }

    log.info({ flowId, count: stepIds.length }, 'Steps reordered')

    return apiNoContent()
  },
  { requireAuth: true },
)
