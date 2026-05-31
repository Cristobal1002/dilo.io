import { getAuthContext } from '@/lib/auth'
import { canManageIntegrations } from '@/lib/org-role'
import EmbedConnectionClient from './embed-connection-client'

export default async function EmbedConnectionPage() {
  const auth = await getAuthContext()

  if (!canManageIntegrations(auth.orgRole)) {
    return (
      <div className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-8 text-center dark:border-[#2A2F3F] dark:bg-[#161821]">
        <h1 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Widget embebido</h1>
        <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Solo usuarios con rol <strong>owner</strong> o <strong>admin</strong> pueden configurar métodos de conexión.
        </p>
      </div>
    )
  }

  return <EmbedConnectionClient />
}
