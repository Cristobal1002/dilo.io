import { OrganizationSettingsForm } from '@/app/dashboard/settings/organization/organization-settings-form'

type Props = {
  canEdit: boolean
}

export function OrganizationPanel({ canEdit }: Props) {
  if (!canEdit) {
    return (
      <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
        Solo usuarios con rol <strong>owner</strong> o <strong>admin</strong> pueden editar el nombre y la marca del
        workspace.
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
        Nombre visible, logo por defecto y sitio web. El logo del workspace se usa en los flows públicos si el flow no
        define uno propio.
      </p>
      <div className="mt-6">
        <OrganizationSettingsForm />
      </div>
    </div>
  )
}
