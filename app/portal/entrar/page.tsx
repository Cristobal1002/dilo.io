import { PortalEntrarClient } from './portal-entrar-client'

type Props = {
  searchParams: Promise<{ email?: string; invite?: string }>
}

export default async function PortalEntrarPage({ searchParams }: Props) {
  const sp = await searchParams
  return (
    <PortalEntrarClient
      initialEmail={sp.email?.trim().toLowerCase() ?? ''}
      inviteToken={sp.invite?.trim() ?? ''}
    />
  )
}
