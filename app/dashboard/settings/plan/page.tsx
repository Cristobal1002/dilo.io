import { redirect } from 'next/navigation'

export default function PlanSettingsRedirectPage() {
  redirect('/dashboard/account?tab=plan')
}
