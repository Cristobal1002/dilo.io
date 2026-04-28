import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { and, desc, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/db'
import { orgIntegrationCredentials, webhooks } from '@/db/schema'
import { findDashboardFlow } from '@/lib/dashboard-flow-access'
import { ConnectorsForm } from './connectors-form'

export default async function FlowConnectorsPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const access = await findDashboardFlow(flowId, orgId ?? userId)
  if (!access) notFound()

  const hookRows = await db.query.webhooks.findMany({
    where: eq(webhooks.flowId, flowId),
    orderBy: [desc(webhooks.createdAt)],
  })

  const resendRow = await db.query.orgIntegrationCredentials.findFirst({
    where: and(
      eq(orgIntegrationCredentials.organizationId, access.org.id),
      eq(orgIntegrationCredentials.provider, 'resend'),
    ),
    columns: { id: true },
  })
  const resendConnected = Boolean(resendRow)

  return (
    <div className="mx-auto flex min-h-0 max-w-2xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Conectores</p>
          <h1 className="mt-1 text-xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">{access.flow.name}</h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Resend a nivel workspace y webhooks por flow cuando un visitante completa el público. Las entregas de
            webhooks quedan registradas en el sistema.
          </p>
        </div>
        <Link
          href={`/dashboard/flows/${flowId}`}
          className="shrink-0 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F9FAFB] dark:border-[#2A2F3F] dark:text-[#9CA3AF] dark:hover:bg-[#252936]"
        >
          ← Volver al editor
        </Link>
      </div>

      <ConnectorsForm flowId={flowId} resendConnected={resendConnected} />

      <div>
        <h2 className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">Webhooks configurados</h2>
        {hookRows.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">Todavía no hay webhooks para este flow.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {hookRows.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8EAEF] bg-white px-3 py-3 text-sm dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
              >
                <span className="min-w-0 break-all font-mono text-xs text-[#374151] dark:text-[#D1D5DB]">{h.url}</span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  {h.active ? 'Activo' : 'Inactivo'}
                  {h.secret ? ' · con secreto' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
