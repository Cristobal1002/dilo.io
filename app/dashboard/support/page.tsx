import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { flows } from '@/db/schema'
import { getAuthContext, getAuthUserInOrg } from '@/lib/auth'
import { dashboardPageClass } from '@/lib/dashboard-page-layout'
import { UnauthorizedError } from '@/lib/errors'
import {
  SUPPORT_ASSIGNEE_FILTERS,
  SUPPORT_FILTER_STATUSES,
  type SupportAssigneeFilter,
  type SupportFilterStatus,
} from '@/lib/support'
import { loadSupportCasesPage } from '@/lib/support-cases-page'
import SupportTable, { type SupportCaseOverview, type SupportFlowOption } from './support-table'

const DEFAULT_PAGE_SIZE = 25

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string; flow?: string; status?: string; assignee?: string }>
}) {
  const auth = await getAuthContext()
  const dbUser = await getAuthUserInOrg(auth)
  if (!dbUser) throw new UnauthorizedError()

  const sp = (await searchParams) ?? {}
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()
  const flowParsed = z.string().uuid().safeParse((sp.flow ?? '').trim())
  const flowId = flowParsed.success ? flowParsed.data : null
  const statusRaw = (sp.status ?? 'all').trim()
  const status: SupportFilterStatus = SUPPORT_FILTER_STATUSES.includes(
    statusRaw as (typeof SUPPORT_FILTER_STATUSES)[number],
  )
    ? (statusRaw as SupportFilterStatus)
    : 'all'
  const assigneeRaw = (sp.assignee ?? 'all').trim()
  const assignee: SupportAssigneeFilter = SUPPORT_ASSIGNEE_FILTERS.includes(
    assigneeRaw as (typeof SUPPORT_ASSIGNEE_FILTERS)[number],
  )
    ? (assigneeRaw as SupportAssigneeFilter)
    : 'all'

  const { cases, total, pageSize } = await loadSupportCasesPage({
    organizationId: auth.org.id,
    status,
    assignee,
    q: q || null,
    flowId,
    currentUserId: dbUser.id,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const initialCases: SupportCaseOverview[] = cases

  const flowRows = await db.query.flows.findMany({
    where: eq(flows.organizationId, auth.org.id),
    columns: { id: true, name: true, status: true },
    orderBy: [desc(flows.updatedAt)],
    limit: 200,
  })

  const flowsForSupport: SupportFlowOption[] = flowRows.map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
  }))

  return (
    <div className={dashboardPageClass}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Soporte</p>
      <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Casos y solicitudes</h1>
      <p className="mt-1 max-w-2xl text-sm text-[#64748B] dark:text-[#94A3B8]">
        Bandeja del equipo: casos creados al completar un flow marcado como soporte. Cada caso distingue{' '}
        <strong>empresa</strong> (cliente para informes) y <strong>solicitante</strong> (persona que envía el
        formulario).
      </p>
      <div className="mt-8">
        <SupportTable
          initialCases={initialCases}
          initialTotal={total}
          initialPage={page}
          pageSize={pageSize}
          initialQ={q}
          initialFlowId={flowId}
          initialStatus={status}
          initialAssignee={assignee}
          flowsForSupport={flowsForSupport}
        />
      </div>
    </div>
  )
}
