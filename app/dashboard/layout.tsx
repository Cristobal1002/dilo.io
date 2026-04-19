import { Suspense } from 'react'
import { DashboardLayoutFallback } from '@/components/dashboard-layout-fallback'
import DiloDashboardShell from '@/components/dilo-dashboard-shell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DiloDashboardShell>{children}</DiloDashboardShell>
    </Suspense>
  )
}
