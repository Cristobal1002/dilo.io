import { eq, and, asc } from 'drizzle-orm'
import { db } from '@/db'
import { flows, organizations, steps, stepOptions } from '@/db/schema'
import { NotFoundError } from '@/lib/errors'
import { DISCOVERY_STUB_FLOW_SEGMENT } from '@/lib/discovery-stub'

export type PublicFlowStepOption = {
  id: string
  label: string
  emoji: string | null
  value: string
  order: number
}

export type PublicFlowStep = {
  id: string
  order: number
  type: string
  question: string
  hint: string | null
  placeholder: string | null
  variableName: string
  required: boolean
  options: PublicFlowStepOption[]
  /** Solo pasos `file`: accept, maxFiles, maxBytesPerFile, etc. */
  fileConfig: unknown | null
  /** Reglas de salto: si respuesta de `if` === `equals`, se salta al paso con `order === skip_to`. */
  conditions: unknown | null
}

export type PublicFlowRecord = {
  id: string
  name: string
  description: string | null
  settings: unknown
}

/**
 * Flow publicado + pasos (solo `status = published`). No expone flows borrador.
 */
export async function loadPublishedFlowWithSteps(flowId: string): Promise<{
  flow: PublicFlowRecord
  steps: PublicFlowStep[]
}> {
  if (flowId === DISCOVERY_STUB_FLOW_SEGMENT) {
    throw new NotFoundError('Flow')
  }

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.status, 'published')),
  })
  if (!flow) {
    throw new NotFoundError('Flow')
  }

  const flowSteps = await db.query.steps.findMany({
    where: eq(steps.flowId, flowId),
    orderBy: asc(steps.order),
  })

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, flow.organizationId),
    columns: { logoUrl: true },
  })

  const withOptions = await Promise.all(
    flowSteps.map(async (step) => {
      const options = await db.query.stepOptions.findMany({
        where: eq(stepOptions.stepId, step.id),
        orderBy: asc(stepOptions.order),
      })
      return {
        id: step.id,
        order: step.order,
        type: step.type,
        question: step.question,
        hint: step.hint,
        placeholder: step.placeholder,
        variableName: step.variableName,
        required: step.required,
        options: options.map((o) => ({
          id: o.id,
          label: o.label,
          emoji: o.emoji,
          value: o.value,
          order: o.order,
        })),
        fileConfig: step.fileConfig ?? null,
        conditions: step.conditions ?? null,
      }
    }),
  )

  const baseSettings =
    flow.settings && typeof flow.settings === 'object' && !Array.isArray(flow.settings)
      ? { ...(flow.settings as Record<string, unknown>) }
      : {}
  const flowLogo = baseSettings.logo_url
  const hasFlowLogo = typeof flowLogo === 'string' && /^https?:\/\//.test(flowLogo)
  const orgLogo =
    org?.logoUrl != null &&
    typeof org.logoUrl === 'string' &&
    /^https:\/\//i.test(org.logoUrl.trim())
      ? org.logoUrl.trim()
      : null
  if (!hasFlowLogo && orgLogo) {
    baseSettings.logo_url = orgLogo
  }

  return {
    flow: {
      id: flow.id,
      name: flow.name,
      description: flow.description,
      settings: baseSettings,
    },
    steps: withOptions,
  }
}
