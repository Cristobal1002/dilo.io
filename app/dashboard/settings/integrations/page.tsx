import { getAuthContext } from '@/lib/auth'
import { canManageIntegrations } from '@/lib/org-role'
import { ResendIntegrationForm } from './resend-integration-form'

export default async function IntegrationsPage() {
  const auth = await getAuthContext()

  if (!canManageIntegrations(auth.orgRole)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Integraciones</h1>
        <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Solo usuarios con rol <strong>owner</strong> o <strong>admin</strong> pueden conectar integraciones para la
          organización.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Workspace</p>
      <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Integraciones</h1>
      <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
        Credenciales a nivel organización. Los flows solo referencian qué hacer; no guardan API keys aquí.
      </p>
      <div className="mt-8 space-y-6">
        <ResendIntegrationForm />
      </div>
    </div>
  )
}
