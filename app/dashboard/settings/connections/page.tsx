import { redirect } from 'next/navigation'

export default function ConnectionsIndexPage() {
  redirect('/dashboard/settings/connections/embed')
}
