import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { flows } from '@/db/schema'
import { getAuthContext } from '@/lib/auth'
import { OUTREACH_FILTER_STATUSES, type OutreachFilterStatus } from '@/lib/outreach'
import { loadOutreachLeadsPage } from '@/lib/outreach-leads-page'
import OutreachTable, { type OutreachFlowOption, type OutreachLeadOverview } from './outreach-table'

const DEFAULT_PAGE_SIZE = 25

export default async function OutreachPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string; flow?: string; status?: string }>
}) {
  const { org } = await getAuthContext()
  const sp = (await searchParams) ?? {}

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const q = (sp.q ?? '').trim()
  const flowParsed = z.string().uuid().safeParse((sp.flow ?? '').trim())
  const flowId = flowParsed.success ? flowParsed.data : null
  const statusRaw = (sp.status ?? 'all').trim()
  const status: OutreachFilterStatus = OUTREACH_FILTER_STATUSES.includes(
    statusRaw as (typeof OUTREACH_FILTER_STATUSES)[number],
  )
    ? (statusRaw as OutreachFilterStatus)
    : 'all'

  const { leads, total, pageSize } = await loadOutreachLeadsPage({
    organizationId: org.id,
    status,
    q: q || null,
    flowId,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const initialLeads: OutreachLeadOverview[] = leads

  const flowRows = await db.query.flows.findMany({
    where: eq(flows.organizationId, org.id),
    columns: { id: true, name: true, status: true },
    orderBy: [desc(flows.updatedAt)],
    limit: 200,
  })

  const flowsForOutreach: OutreachFlowOption[] = flowRows.map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
  }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Outreach</p>
      <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Cold email & seguimiento</h1>
      <p className="mt-1 max-w-2xl text-sm text-[#64748B] dark:text-[#94A3B8]">
        Leads por organización, registro de envíos con pixel de apertura y redirección de clics, y envío opcional del
        cold mail con Resend (Integraciones). Podés asociar un <strong>flow</strong> para usar su plantilla de
        outreach (Conectores del flow); si no, se usa la plantilla del workspace. Los enlaces usan un token opaco (no
        el UUID interno).
      </p>
      <div className="mt-8">
        <OutreachTable
          initialLeads={initialLeads}
          initialTotal={total}
          initialPage={page}
          pageSize={pageSize}
          initialQ={q}
          initialFlowId={flowId}
          initialStatus={status}
          flowsForOutreach={flowsForOutreach}
        />
      </div>
    </div>
  )
}
