import { dashboardPageClass } from '@/lib/dashboard-page-layout'
import { dashboardDesc, dashboardEyebrow, dashboardTitle } from '@/lib/dashboard-ui'
import ClientsPageClient from './clients-page-client'

export default function ClientsPage() {
  return (
    <div className={dashboardPageClass}>
      <p className={dashboardEyebrow}>Directorio</p>
      <h1 className={dashboardTitle}>Clientes</h1>
      <p className={dashboardDesc}>
        Directorio de empresas que atiendes. Carga masiva con Excel o uno a uno. Para el widget embebido, ve a
        Configuración → Conexiones.
      </p>
      <div className="mt-8">
        <ClientsPageClient />
      </div>
    </div>
  )
}
