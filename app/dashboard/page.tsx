import Link from 'next/link'
import { redirect } from 'next/navigation'
import { count, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { flows, sessions } from '@/db/schema'
import { FlowList } from '@/components/flow-list'
import { getAuthContext } from '@/lib/auth'
import { getDatabaseConnectionInfo } from '@/lib/database-info'
import { UnauthorizedError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import { dashboardPageClass } from '@/lib/dashboard-page-layout'

export const dynamic = 'force-dynamic'

const log = createLogger('dashboard')

export default async function DashboardPage() {
  let org
  try {
    ;({ org } = await getAuthContext())
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect('/sign-in')
    throw e
  }

  const flowList = await db.query.flows.findMany({
    where: eq(flows.organizationId, org.id),
    orderBy: desc(flows.updatedAt),
    limit: 50,
  })

  const dbInfo = getDatabaseConnectionInfo()
  log.info(
    {
      dbBranchHint: dbInfo?.branchHint,
      dbHost: dbInfo?.host,
      diloOrgId: org.id,
      orgSlug: org.slug,
      flowCount: flowList.length,
    },
    'Dashboard flows loaded',
  )

  // Count sessions per flow in a single query
  const sessionCounts =
    flowList.length > 0
      ? await db
          .select({ flowId: sessions.flowId, cnt: count() })
          .from(sessions)
          .where(inArray(sessions.flowId, flowList.map((f) => f.id)))
          .groupBy(sessions.flowId)
      : []

  const countMap = new Map(sessionCounts.map((r) => [r.flowId, r.cnt]))

  const flowsWithCount = flowList.map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    updatedAt: f.updatedAt,
    sessionCount: countMap.get(f.id) ?? 0,
  }))

  return (
    <div className={dashboardPageClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Mis Flows</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Crea flujos conversacionales desde un prompt de texto
          </p>
        </div>
        <Link
          href="/dashboard/flows/new"
          className="inline-flex items-center justify-center rounded-full bg-linear-to-br from-dilo-500 to-dilo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-dilo-500/20 transition-opacity hover:opacity-95"
        >
          + Nuevo Flow
        </Link>
      </div>

      {flowsWithCount.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E0E4EB] bg-[#FAFBFC] p-14 text-center dark:border-[#2A2F3F] dark:bg-[#161821] md:p-16">
          <div className="text-5xl mb-4" aria-hidden="true">
            💬
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Aún no tienes flows</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm leading-relaxed">
            Describe lo que necesitas en una frase y Dilo genera el flujo conversacional
            automáticamente
          </p>
          <Link
            href="/dashboard/flows/new"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white bg-linear-to-br from-dilo-500 to-dilo-600 shadow-sm shadow-dilo-500/20 transition-opacity hover:opacity-95"
          >
            Crear mi primer flow
          </Link>
        </div>
      ) : (
        <FlowList flows={flowsWithCount} />
      )}
    </div>
  )
}
