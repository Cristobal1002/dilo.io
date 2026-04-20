import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, steps } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiNoContent, apiSuccess } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('flows/[flowId]/steps/[stepId]')

const STEP_TYPES = [
  'text', 'long_text', 'select', 'multi_select',
  'email', 'phone', 'number', 'rating', 'yes_no', 'file',
] as const

const UpdateStepSchema = z
  .object({
    type: z.enum(STEP_TYPES).optional(),
    question: z.string().min(1).max(2000).optional(),
    hint: z.string().max(500).nullable().optional(),
    variableName: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Solo letras, números y guiones bajos')
      .optional(),
    required: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.type !== undefined ||
      d.question !== undefined ||
      d.hint !== undefined ||
      d.variableName !== undefined ||
      d.required !== undefined,
    { message: 'Debe enviar al menos un campo para actualizar' },
  )

export const PATCH = withApiHandler(
  async (req: NextRequest, { auth, params }) => {
    const { org } = auth
    const { flowId, stepId } = params

    const body = await req.json()
    const parsed = UpdateStepSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
    }

    // Verify ownership
    const flow = await db.query.flows.findFirst({
      where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
    })
    if (!flow) throw new NotFoundError('Flow')

    const step = await db.query.steps.findFirst({
      where: and(eq(steps.id, stepId), eq(steps.flowId, flowId)),
    })
    if (!step) throw new NotFoundError('Paso')

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type
    if (parsed.data.question !== undefined) updateData.question = parsed.data.question
    if (parsed.data.hint !== undefined) updateData.hint = parsed.data.hint
    if (parsed.data.variableName !== undefined) updateData.variableName = parsed.data.variableName
    if (parsed.data.required !== undefined) updateData.required = parsed.data.required

    const [updated] = await db
      .update(steps)
      .set(updateData)
      .where(eq(steps.id, stepId))
      .returning()

    log.info({ flowId, stepId, changes: Object.keys(updateData) }, 'Step updated')

    return apiSuccess({ step: updated })
  },
  { requireAuth: true },
)

export const DELETE = withApiHandler(
  async (_req: NextRequest, { auth, params }) => {
    const { org } = auth
    const { flowId, stepId } = params

    // Verify ownership
    const flow = await db.query.flows.findFirst({
      where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
    })
    if (!flow) throw new NotFoundError('Flow')

    const step = await db.query.steps.findFirst({
      where: and(eq(steps.id, stepId), eq(steps.flowId, flowId)),
    })
    if (!step) throw new NotFoundError('Paso')

    await db.delete(steps).where(eq(steps.id, stepId))

    // Reorder remaining steps to keep order contiguous
    const remaining = await db.query.steps.findMany({
      where: eq(steps.flowId, flowId),
      orderBy: asc(steps.order),
    })

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await db.update(steps).set({ order: i }).where(eq(steps.id, remaining[i].id))
      }
    }

    log.info({ flowId, stepId }, 'Step deleted and order normalized')

    return apiNoContent()
  },
  { requireAuth: true },
)
