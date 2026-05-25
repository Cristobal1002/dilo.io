import { redirect } from 'next/navigation'

export default function OrganizationSettingsRedirectPage() {
  redirect('/dashboard/account?tab=organization')
}
