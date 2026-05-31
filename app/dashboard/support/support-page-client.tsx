'use client'

import { useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { pillTabActiveClass, pillTabBaseClass, pillTabInactiveClass } from '@/lib/pill-tab-styles'
import { linkAccent } from '@/lib/dashboard-ui'
import { cn } from '@/lib/utils'
import SupportReportsPanel from './support-reports-panel'
import SupportTable, {
  type SupportCaseOverview,
  type SupportFlowOption,
} from './support-table'
import type { SupportAssigneeFilter, SupportFilterStatus } from '@/lib/support'

export type SupportView = 'cases' | 'reports'

function isSupportView(v: string | null): v is SupportView {
  return v === 'cases' || v === 'reports'
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

  useEffect(() => {
    if (viewParam === 'clients') {
      router.replace('/dashboard/clients')
    }
  }, [viewParam, router])

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
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-2">
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
        </div>
        <Link href="/dashboard/clients" className={linkAccent}>
          Gestionar clientes →
        </Link>
      </div>

      {view === 'reports' ? (
        <SupportReportsPanel />
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
