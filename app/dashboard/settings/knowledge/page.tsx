import { getAuthContext } from '@/lib/auth'
import { dashboardPageClass } from '@/lib/dashboard-page-layout'
import { dashboardDesc, dashboardEyebrow, dashboardTitle } from '@/lib/dashboard-ui'
import { canManageIntegrations } from '@/lib/org-role'
import KnowledgePageClient from './knowledge-page-client'

export default async function KnowledgePage() {
  const auth = await getAuthContext()

  if (!canManageIntegrations(auth.orgRole)) {
    return (
      <div className={`${dashboardPageClass} py-10 text-center`}>
        <h1 className="text-lg font-bold text-foreground">Base de conocimiento</h1>
        <p className={`${dashboardDesc} mx-auto`}>
          Solo usuarios con rol <strong>owner</strong> o <strong>admin</strong> pueden gestionar artículos.
        </p>
      </div>
    )
  }

  return (
    <div className={dashboardPageClass}>
      <p className={dashboardEyebrow}>Configuración</p>
      <h1 className={dashboardTitle}>Base de conocimiento</h1>
      <p className={dashboardDesc}>
        Artículos que la IA consulta antes de abrir un caso de soporte. Activa la deflexión en Conectores del flow.
      </p>
      <div className="mt-8">
        <KnowledgePageClient />
      </div>
    </div>
  )
}
