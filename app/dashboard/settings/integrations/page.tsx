import { getAuthContext } from '@/lib/auth'
import { canManageIntegrations } from '@/lib/org-role'
import { dashboardPageClass } from '@/lib/dashboard-page-layout'
import { IntegrationGrid } from './integration-grid'

export default async function IntegrationsPage() {
  const auth = await getAuthContext()

  if (!canManageIntegrations(auth.orgRole)) {
    return (
      <div className={`${dashboardPageClass} py-10 text-center`}>
        <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Integraciones</h1>
        <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Solo usuarios con rol <strong>owner</strong> o <strong>admin</strong> pueden conectar integraciones para la
          organización.
        </p>
        </div>
      </div>
    )
  }

  return (
    <div className={dashboardPageClass}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Workspace</p>
      <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Integraciones</h1>
      <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
        Catálogo de conexiones a nivel organización: ves qué está activo, qué falta por configurar y qué llegará en
        próximas versiones. Las API keys no viven en los flows.
      </p>
      <IntegrationGrid />
    </div>
  )
}
