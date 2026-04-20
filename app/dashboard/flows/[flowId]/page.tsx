import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { steps, stepOptions } from '@/db/schema'
import { asc, eq, inArray } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { findDashboardFlow } from '@/lib/dashboard-flow-access'
import FlowWorkspace, { type FlowWorkspaceFlow, type FlowWorkspaceStep } from './flow-workspace'

async function getFlow(flowId: string, orgIdentifier: string) {
  const access = await findDashboardFlow(flowId, orgIdentifier)
  if (!access) return null

  const { flow } = access

  const flowSteps = await db.query.steps.findMany({
    where: eq(steps.flowId, flowId),
    orderBy: asc(steps.order),
  })

  const allOptions =
    flowSteps.length === 0
      ? []
      : await db.query.stepOptions.findMany({
          where: inArray(
            stepOptions.stepId,
            flowSteps.map((s) => s.id),
          ),
          orderBy: [asc(stepOptions.stepId), asc(stepOptions.order)],
        })

  const optionsByStep = new Map<string, typeof allOptions>()
  for (const o of allOptions) {
    const list = optionsByStep.get(o.stepId) ?? []
    list.push(o)
    optionsByStep.set(o.stepId, list)
  }

  const stepsWithOptions = flowSteps.map((step) => ({
    ...step,
    options: optionsByStep.get(step.id) ?? [],
  }))

  return { flow, steps: stepsWithOptions }
}

export default async function FlowDetailPage({
  params,
}: {
  params: Promise<{ flowId: string }>
}) {
  const { flowId } = await params
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const data = await getFlow(flowId, orgId ?? userId)
  if (!data) notFound()

  const { flow, steps: flowSteps } = data

  const flowPayload: FlowWorkspaceFlow = {
    id: flow.id,
    name: flow.name,
    description: flow.description ?? null,
    status: flow.status,
    promptOrigin: flow.promptOrigin,
    settings: (flow.settings ?? {}) as FlowWorkspaceFlow['settings'],
  }

  const stepsPayload: FlowWorkspaceStep[] = flowSteps.map((s) => ({
    id: s.id,
    order: s.order,
    type: s.type,
    question: s.question,
    hint: s.hint,
    variableName: s.variableName,
    required: s.required,
    options: s.options.map((o) => ({
      id: o.id,
      label: o.label,
      emoji: o.emoji,
      value: o.value,
      order: o.order,
    })),
    fileConfig: s.fileConfig,
  }))

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const publicFlowUrl =
    flow.status === 'published' && base ? `${base}/f/${flow.id}` : flow.status === 'published' ? `/f/${flow.id}` : null

  return <FlowWorkspace flow={flowPayload} steps={stepsPayload} publicFlowUrl={publicFlowUrl} />
}
