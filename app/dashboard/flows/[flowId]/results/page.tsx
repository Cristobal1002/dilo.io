import { auth } from '@clerk/nextjs/server'
import { and, desc, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { db } from '@/db'
import { results, sessions } from '@/db/schema'
import { findDashboardFlow } from '@/lib/dashboard-flow-access'
import { getFlowResultsAnalytics } from '@/lib/flow-results-analytics'
import { getFlowResultsDetailTable } from '@/lib/flow-results-detail-table'
import { FlowResultsView } from './flow-results-view'

export default async function FlowResultsPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const access = await findDashboardFlow(flowId, orgId ?? userId)
  if (!access) notFound()

  const rows = await db
    .select({
      sessionId: sessions.id,
      completedAt: sessions.completedAt,
      contact: sessions.contact,
      summary: results.summary,
      score: results.score,
      classification: results.classification,
      suggestedAction: results.suggestedAction,
    })
    .from(sessions)
    .leftJoin(results, eq(results.sessionId, sessions.id))
    .where(and(eq(sessions.flowId, flowId), eq(sessions.status, 'completed')))
    .orderBy(desc(sessions.completedAt))

  const serialized = rows.map((r) => ({
    sessionId: r.sessionId,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    summary: r.summary,
    score: r.score,
    classification: r.classification,
    suggestedAction: r.suggestedAction,
    contact: r.contact,
  }))

  const detailTable = await getFlowResultsDetailTable(
    flowId,
    rows.map((r) => ({
      sessionId: r.sessionId,
      completedAt: r.completedAt,
      classification: r.classification,
      score: r.score,
      contact: r.contact,
    })),
  )

  const scoreVals = rows.map((r) => r.score).filter((s): s is number => s != null)
  const avgScoreAgg =
    scoreVals.length > 0
      ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) * 10) / 10
      : null

  const analytics = await getFlowResultsAnalytics(flowId, { avgScoreFromResults: avgScoreAgg })

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-8 text-sm text-[#6B7280] dark:text-[#9CA3AF] sm:px-6 lg:px-8">
          Cargando resultados…
        </div>
      }
    >
      <FlowResultsView
        flowId={flowId}
        flowName={access.flow.name}
        rows={serialized}
        analytics={analytics}
        detailTable={detailTable}
      />
    </Suspense>
  )
}
