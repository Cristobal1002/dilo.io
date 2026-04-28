import { NextRequest } from 'next/server'
import { z } from 'zod'
import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, plans, steps, stepOptions } from '@/db/schema'
import { FLOW_TEMPLATE_IDS, getFlowTemplateById } from '@/lib/flow-templates'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiCreated } from '@/lib/api-response'
import { ForbiddenError, InternalError, ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import { PLAN_LIMITS, isPlan } from '@/lib/plan-limits'

const log = createLogger('flows/from-template')

const BodySchema = z.object({
  templateId: z.enum(FLOW_TEMPLATE_IDS),
})

async function getOrgFlowsLimit(orgPlan: string): Promise<number> {
  const planRow = await db.query.plans.findFirst({
    where: eq(plans.id, orgPlan),
    columns: { flowsLimit: true },
  })
  const fallback = isPlan(orgPlan) ? PLAN_LIMITS[orgPlan].flows : PLAN_LIMITS.free.flows
  return planRow?.flowsLimit ?? fallback
}

async function countOrgFlows(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(flows)
    .where(eq(flows.organizationId, organizationId))
  return row?.count ?? 0
}

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  const { org, userId } = auth

  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Plantilla inválida', parsed.error.flatten().fieldErrors)
  }

  const template = getFlowTemplateById(parsed.data.templateId)
  if (!template) {
    throw new ValidationError('Plantilla no encontrada')
  }

  const flowsLimit = await getOrgFlowsLimit(org.plan)
  const flowCount = await countOrgFlows(org.id)
  if (flowsLimit !== -1 && flowCount >= flowsLimit) {
    throw new ForbiddenError(
      `Has alcanzado el límite de flows de tu plan (${flowsLimit}). Sube de plan o archiva flows para continuar.`,
    )
  }

  log.info({ userId, orgId: org.id, templateId: template.id }, 'Cloning flow from template')

  let newFlow: (typeof flows.$inferSelect) | undefined
  try {
    const { flow } = template
    const [inserted] = await db
      .insert(flows)
      .values({
        organizationId: org.id,
        name: flow.name,
        description: flow.description,
        promptOrigin: `template:${template.id}`,
        status: 'draft',
        settings: {
          ...flow.settings,
          transition_style: flow.settings.transition_style ?? 'ai',
          template_id: template.id,
        },
        scoringCriteria: {
          ...flow.scoring_criteria,
          objective: template.scoringObjective,
        },
      })
      .returning()

    if (!inserted) throw new Error('insert flows returned no row')
    newFlow = inserted

    for (const step of template.steps) {
      const [newStep] = await db
        .insert(steps)
        .values({
          flowId: newFlow.id,
          order: step.order,
          type: step.type,
          question: step.question,
          hint: step.hint ?? null,
          placeholder: step.placeholder ?? null,
          variableName: step.variable_name,
          required: step.required,
          conditions: step.conditions ?? null,
          fileConfig: step.file_config ?? null,
          branchLabel: step.branch_label ?? null,
          branchColor: step.branch_color ?? null,
        })
        .returning()

      if (!newStep) throw new Error('insert steps returned no row')

      if (step.options && step.options.length > 0) {
        await db.insert(stepOptions).values(
          step.options.map((opt) => ({
            stepId: newStep.id,
            label: opt.label,
            value: opt.value,
            emoji: opt.emoji ?? null,
            order: opt.order,
          })),
        )
      }
    }
  } catch (err) {
    log.error({ err, orgId: org.id, flowId: newFlow?.id }, 'DB insert failed cloning template')
    if (newFlow) {
      await db.delete(flows).where(eq(flows.id, newFlow.id))
    }
    throw new InternalError('Error guardando el flow en la base de datos')
  }

  if (!newFlow) {
    throw new InternalError('Error interno al clonar la plantilla')
  }

  log.info({ flowId: newFlow.id, orgId: org.id, templateId: template.id }, 'Flow cloned from template')

  return apiCreated({ flow: newFlow })
}, { requireAuth: true })
