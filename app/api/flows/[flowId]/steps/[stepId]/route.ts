import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, asc, count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, stepOptions, steps } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiNoContent, apiSuccess } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import { validateStepConditionsInput } from '@/lib/validate-step-conditions'

const log = createLogger('flows/[flowId]/steps/[stepId]')

const STEP_TYPES = [
  'text', 'long_text', 'select', 'multi_select',
  'email', 'phone', 'number', 'rating', 'yes_no', 'file',
] as const

const ConditionRuleSchema = z.object({
  if: z.string().min(1).max(100).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Variable inválida'),
  equals: z.string().min(1).max(500),
  skip_to: z.number().int().min(0).max(99_999),
})

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
    conditions: z.union([z.null(), ConditionRuleSchema, z.array(ConditionRuleSchema).min(1).max(25)]).optional(),
    branchLabel: z.union([z.null(), z.string().max(80)]).optional(),
    branchColor: z
      .union([z.null(), z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Usa un color #RRGGBB de la paleta')])
      .optional(),
  })
  .refine(
    (d) =>
      d.type !== undefined ||
      d.question !== undefined ||
      d.hint !== undefined ||
      d.variableName !== undefined ||
      d.required !== undefined ||
      d.conditions !== undefined ||
      d.branchLabel !== undefined ||
      d.branchColor !== undefined,
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

    const nextVariableName = (parsed.data.variableName ?? step.variableName).trim()
    const nextOrder = step.order

    if (parsed.data.conditions !== undefined) {
      const flowSteps = await db.query.steps.findMany({
        where: eq(steps.flowId, flowId),
        columns: { order: true, variableName: true },
      })
      const stepOrders = flowSteps.map((s) => s.order)
      const variableNames = new Set(flowSteps.map((s) => s.variableName.trim()))
      const condErr = validateStepConditionsInput(parsed.data.conditions, {
        stepOrders,
        variableNames,
        currentVariableName: nextVariableName,
        currentStepOrder: nextOrder,
      })
      if (condErr) {
        throw new ValidationError(condErr)
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type
    if (parsed.data.question !== undefined) updateData.question = parsed.data.question
    if (parsed.data.hint !== undefined) updateData.hint = parsed.data.hint
    if (parsed.data.variableName !== undefined) updateData.variableName = parsed.data.variableName
    if (parsed.data.required !== undefined) updateData.required = parsed.data.required
    if (parsed.data.conditions !== undefined) {
      updateData.conditions = parsed.data.conditions
    }
    if (parsed.data.branchLabel !== undefined) {
      const v = parsed.data.branchLabel
      updateData.branchLabel = v === null || v.trim() === '' ? null : v.trim()
    }
    if (parsed.data.branchColor !== undefined) {
      updateData.branchColor = parsed.data.branchColor
    }

    const [updated] = await db
      .update(steps)
      .set(updateData)
      .where(eq(steps.id, stepId))
      .returning()

    const finalType = (updated?.type ?? step.type) as string
    if (finalType === 'select' || finalType === 'multi_select') {
      const [cntRow] = await db
        .select({ c: count() })
        .from(stepOptions)
        .where(eq(stepOptions.stepId, stepId))
      if ((cntRow?.c ?? 0) === 0) {
        await db.insert(stepOptions).values({
          stepId,
          label: 'Opción 1',
          value: 'opcion_1',
          emoji: null,
          order: 0,
        })
      }
    }

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
