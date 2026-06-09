import { redirect } from 'next/navigation'
import { getPortalSessionEmail } from '@/lib/portal-session'
import PortalPageClient from './portal-page-client'

export default async function PortalPage() {
  if (!(await getPortalSessionEmail())) {
    redirect('/portal/entrar')
  }
  return <PortalPageClient />
}
