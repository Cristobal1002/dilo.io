import { Suspense } from 'react'
import DiloDashboardShell from '@/components/dilo-dashboard-shell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-[#0F1117]" />}>
      <DiloDashboardShell>{children}</DiloDashboardShell>
    </Suspense>
  )
}
