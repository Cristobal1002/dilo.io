import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { DashboardLayoutFallback } from '@/components/dashboard-layout-fallback'
import DiloDashboardShell from '@/components/dilo-dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (userId) {
    // Check if this user has completed onboarding (has a name in the DB).
    // Users who registered before the onboarding feature are exempt if they
    // already have a name — we only send truly blank profiles to onboarding.
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: { name: true, phone: true },
    })

    // New user with no profile data → send to onboarding
    if (user && !user.name?.trim()) {
      redirect('/onboarding')
    }
  }

  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DiloDashboardShell>{children}</DiloDashboardShell>
    </Suspense>
  )
}
