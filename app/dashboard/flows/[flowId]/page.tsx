import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { flows, steps, stepOptions, organizations } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import FlowWorkspace, { type FlowWorkspaceFlow, type FlowWorkspaceStep } from './flow-workspace'

async function getFlow(flowId: string, orgIdentifier: string) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgIdentifier),
  })
  if (!org) return null

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
  })
  if (!flow) return null

  const flowSteps = await db.query.steps.findMany({
    where: eq(steps.flowId, flowId),
    orderBy: asc(steps.order),
  })

  const stepsWithOptions = await Promise.all(
    flowSteps.map(async (step) => {
      const options = await db.query.stepOptions.findMany({
        where: eq(stepOptions.stepId, step.id),
        orderBy: asc(stepOptions.order),
      })
      return { ...step, options }
    }),
  )

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
