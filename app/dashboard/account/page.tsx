import { Suspense } from 'react'
import { AccountPageClient } from '@/components/account/account-page-client'
import { dashboardPageClass } from '@/lib/dashboard-page-layout'

export default function DashboardAccountPage() {
  return (
    <Suspense
      fallback={
        <div className={dashboardPageClass}>
          <div className="h-8 w-48 animate-pulse rounded bg-[#E5E7EB] dark:bg-[#2A2F3F]" />
        </div>
      }
    >
      <AccountPageClient />
    </Suspense>
  )
}
