import type { Metadata } from 'next'
import { PublicFlowRunner } from '@/components/public-flow-runner'

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
  return <PublicFlowRunner flowId={flowId} />
}
