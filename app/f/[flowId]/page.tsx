import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicFlowRunner } from '@/components/public-flow-runner'
import { loadPublishedFlowWithSteps } from '@/lib/load-published-flow'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ flowId: string }>
}): Promise<Metadata> {
  const { flowId } = await params
  return {
    title: `Flow · Dilo`,
    description: `Conversación guiada · ${flowId.slice(0, 8)}…`,
  }
}

export default async function PublicFlowPage({
  params,
}: {
  params: Promise<{ flowId: string }>
}) {
  const { flowId } = await params

  let initialPayload
  try {
    initialPayload = await loadPublishedFlowWithSteps(flowId)
  } catch {
    notFound()
  }

  return <PublicFlowRunner key={flowId} flowId={flowId} initialPayload={initialPayload} />
}
