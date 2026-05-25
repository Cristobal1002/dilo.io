import { redirect } from 'next/navigation'

export default function TeamSettingsRedirectPage() {
  redirect('/dashboard/account?tab=team')
}
