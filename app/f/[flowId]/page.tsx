import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { PublicFlowRunner } from '@/components/public-flow-runner'
import { db } from '@/db'
import { flows } from '@/db/schema'
import { resolveEmbedContextForFlow } from '@/lib/embed-context'
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

function firstQuery(sp: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = sp[key]
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0].trim()
  return null
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
  let organizationId: string
  try {
    initialPayload = await loadPublishedFlowWithSteps(flowId)
    const flowRow = await db.query.flows.findFirst({
      where: eq(flows.id, flowId),
      columns: { organizationId: true },
    })
    if (!flowRow) notFound()
    organizationId = flowRow.organizationId
  } catch {
    notFound()
  }

  const embedContext = await resolveEmbedContextForFlow({
    flowId,
    organizationId,
    ctx: firstQuery(sp, 'ctx'),
    client: firstQuery(sp, 'client'),
    externalId: firstQuery(sp, 'external_id') ?? firstQuery(sp, 'externalId'),
  })

  return (
    <PublicFlowRunner
      flowId={flowId}
      initialPayload={initialPayload}
      isEmbed={isEmbed}
      embedContext={embedContext}
      embedQuery={{
        ctx: firstQuery(sp, 'ctx'),
        client: firstQuery(sp, 'client'),
        externalId: firstQuery(sp, 'external_id') ?? firstQuery(sp, 'externalId'),
      }}
    />
  )
}
