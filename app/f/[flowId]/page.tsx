import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { PublicFlowRunner } from '@/components/public-flow-runner'
import { db } from '@/db'
import { flows } from '@/db/schema'
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

function EmbedUnavailable() {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 bg-[#FAF7FF] p-6 text-center text-sm text-[#4B5563] dark:bg-[#0F1117] dark:text-[#9CA3AF]">
      <p className="font-semibold text-[#111827] dark:text-[#F3F4F6]">Este flow no está disponible para embed.</p>
      <p className="max-w-sm text-xs leading-relaxed opacity-90">
        Publica el flow en el dashboard de Dilo para activar la vista embebida.
      </p>
    </div>
  )
}

export default async function PublicFlowPage({
  params,
  searchParams,
}: {
  params: Promise<{ flowId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { flowId } = await params
  const sp = await searchParams
  const embedRaw = sp.embed
  const isEmbed = embedRaw === '1' || embedRaw === 'true'

  if (isEmbed) {
    const row = await db.query.flows.findFirst({
      where: eq(flows.id, flowId),
      columns: { status: true },
    })
    if (!row) notFound()
    if (row.status !== 'published') {
      return <EmbedUnavailable />
    }
  }

  let initialPayload
  try {
    initialPayload = await loadPublishedFlowWithSteps(flowId)
  } catch {
    notFound()
  }

  return <PublicFlowRunner flowId={flowId} initialPayload={initialPayload} isEmbed={isEmbed} />
}
