'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { pillTabActiveClass, pillTabBaseClass, pillTabInactiveClass } from '@/lib/pill-tab-styles'
import { cn } from '@/lib/utils'
import SupportReportsPanel from './support-reports-panel'
import SupportClientsPanel from './support-clients-panel'
import SupportTable, {
  type SupportCaseOverview,
  type SupportFlowOption,
} from './support-table'
import type { SupportAssigneeFilter, SupportFilterStatus } from '@/lib/support'

export type SupportView = 'cases' | 'reports' | 'clients'

function isSupportView(v: string | null): v is SupportView {
  return v === 'cases' || v === 'reports' || v === 'clients'
}

export default function SupportPageClient({
  initialCases,
  initialTotal,
  initialPage,
  pageSize,
  initialQ,
  initialFlowId,
  initialStatus,
  initialAssignee,
  flowsForSupport,
}: {
  initialCases: SupportCaseOverview[]
  initialTotal: number
  initialPage: number
  pageSize: number
  initialQ: string
  initialFlowId: string | null
  initialStatus: SupportFilterStatus
  initialAssignee: SupportAssigneeFilter
  flowsForSupport: SupportFlowOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const view: SupportView = isSupportView(viewParam) ? viewParam : 'cases'

  const setView = useCallback(
    (next: SupportView) => {
      const p = new URLSearchParams(searchParams.toString())
      if (next === 'cases') {
        p.delete('view')
      } else {
        p.set('view', next)
      }
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [pathname, router, searchParams],
  )

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView('cases')}
          className={cn(pillTabBaseClass, view === 'cases' ? pillTabActiveClass : pillTabInactiveClass)}
        >
          Casos
        </button>
        <button
          type="button"
          onClick={() => setView('reports')}
          className={cn(pillTabBaseClass, view === 'reports' ? pillTabActiveClass : pillTabInactiveClass)}
        >
          Informes
        </button>
        <button
          type="button"
          onClick={() => setView('clients')}
          className={cn(pillTabBaseClass, view === 'clients' ? pillTabActiveClass : pillTabInactiveClass)}
        >
          Clientes
        </button>
      </div>

      {view === 'reports' ? (
        <SupportReportsPanel />
      ) : view === 'clients' ? (
        <SupportClientsPanel />
      ) : (
        <SupportTable
          initialCases={initialCases}
          initialTotal={initialTotal}
          initialPage={initialPage}
          pageSize={pageSize}
          initialQ={initialQ}
          initialFlowId={initialFlowId}
          initialStatus={initialStatus}
          initialAssignee={initialAssignee}
          flowsForSupport={flowsForSupport}
        />
      )}
    </>
  )
}
