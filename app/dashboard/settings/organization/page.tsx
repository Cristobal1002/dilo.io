import { getAuthContext } from '@/lib/auth'
import { canManageIntegrations } from '@/lib/org-role'
import { OrganizationSettingsForm } from './organization-settings-form'

export default async function OrganizationSettingsPage() {
  const auth = await getAuthContext()

  if (!canManageIntegrations(auth.orgRole)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Organización</h1>
        <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Solo usuarios con rol <strong>owner</strong> o <strong>admin</strong> pueden editar el nombre y la marca del
          workspace.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Workspace</p>
      <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Organización</h1>
      <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
        Nombre visible, logo por defecto y sitio web. El logo del workspace se usa en los flows públicos si el flow no
        define uno propio.
      </p>
      <div className="mt-8">
        <OrganizationSettingsForm />
      </div>
    </div>
  )
}
