'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { PortalAuthPrompt } from '@/components/portal/portal-auth-prompt'
import { readApiResult } from '@/lib/read-api-result'
import { CLIENT_PORTAL_ROLE_LABEL, type ClientPortalRole } from '@/lib/client-portal-roles'

type Preview = {
  email: string
  role: string
  clientName: string
  providerName: string
}

export default function PortalInviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadPreview = useCallback(async () => {
    const res = await fetch(`/api/portal-invitations/${token}`)
    const r = await readApiResult<Preview>(res)
    if (r.ok) setPreview(r.data)
    else setError(r.message)
  }, [token])

  useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal-invitations/${token}/accept`, { method: 'POST' })
      const r = await readApiResult<{ clientName: string }>(res)
      if (!r.ok) {
        setError(r.message)
        return
      }
      router.replace('/portal')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!preview && !error) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-[#64748B]">
        Cargando invitación…
      </main>
    )
  }

  if (error && !preview) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/portal" className="mt-4 inline-block text-sm text-[#7C3AED]">
          Ir al portal
        </Link>
      </main>
    )
  }

  const returnPath = `/portal-invite/${token}`
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? ''
  const roleLabel =
    CLIENT_PORTAL_ROLE_LABEL[preview?.role as ClientPortalRole] ?? preview?.role
  const emailMatches =
    preview != null && userEmail.toLowerCase() === preview.email.toLowerCase()

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F8F9FB]">
        Portal de soporte — {preview?.clientName}
      </h1>
      <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
        Invitación para <strong>{preview?.email}</strong> como {roleLabel}. Operado por{' '}
        {preview?.providerName}.
      </p>

      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {!isLoaded ? (
        <p className="mt-6 text-sm text-[#64748B]">Comprobando sesión…</p>
      ) : !isSignedIn ? (
        <PortalAuthPrompt
          returnPath={returnPath}
          expectedEmail={preview?.email}
          description="Crea tu cuenta o inicia sesión con el correo de la invitación. No verás el onboarding de Dilo."
        />
      ) : emailMatches ? (
        <div className="mt-8">
          <PortalAuthPrompt returnPath={returnPath} expectedEmail={preview?.email} />
          <button
            type="button"
            disabled={busy}
            onClick={() => void accept()}
            className="mt-4 w-full rounded-xl bg-[#9C77F5] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Accediendo…' : 'Aceptar invitación'}
          </button>
        </div>
      ) : (
        <PortalAuthPrompt returnPath={returnPath} expectedEmail={preview?.email} />
      )}
    </main>
  )
}
