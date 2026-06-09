import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { DashboardLayoutFallback } from '@/components/dashboard-layout-fallback'
import DiloDashboardShell from '@/components/dilo-dashboard-shell'
import { getAuthContext, getAuthUserInOrg } from '@/lib/auth'
import { UnauthorizedError, PortalOnlyUserError } from '@/lib/errors'

function hasOnboardingCompleted(
  user: { name: string | null; phone: string | null } | null | undefined,
  onboardingData: unknown,
): boolean {
  if (user?.name?.trim()) return true
  if (onboardingData && typeof onboardingData === 'object') {
    return Object.keys(onboardingData as object).length > 0
  }
  return false
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (userId) {
    try {
      const authCtx = await getAuthContext()
      const user = await getAuthUserInOrg(authCtx)

      if (!hasOnboardingCompleted(user, authCtx.org.onboardingData)) {
        redirect('/onboarding')
      }
    } catch (e) {
      if (e instanceof PortalOnlyUserError) {
        redirect('/portal')
      }
      if (e instanceof UnauthorizedError) {
        redirect('/sign-in')
      }
      throw e
    }
  }

  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DiloDashboardShell>{children}</DiloDashboardShell>
    </Suspense>
  )
}
