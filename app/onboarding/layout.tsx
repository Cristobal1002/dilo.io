import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isPortalOnlyUser } from '@/lib/portal-auth'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (userId && (await isPortalOnlyUser(userId))) {
    redirect('/portal')
  }
  return children
}
