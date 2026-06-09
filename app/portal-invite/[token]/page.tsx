import { redirect } from 'next/navigation'

export default async function PortalInviteRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  redirect(`/portal/entrar?invite=${encodeURIComponent(token)}`)
}
