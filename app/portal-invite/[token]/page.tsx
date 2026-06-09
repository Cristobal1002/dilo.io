'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'
import { portalSignInUrl, portalSignUpUrl } from '@/lib/auth-redirect'
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
        <Link href="/" className="mt-4 inline-block text-sm text-[#7C3AED]">
          Ir al inicio
        </Link>
      </main>
    )
  }

  const returnPath = `/portal-invite/${token}`
  const signInUrl = portalSignInUrl(returnPath)
  const signUpUrl = portalSignUpUrl(returnPath)
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? ''
  const roleLabel =
    CLIENT_PORTAL_ROLE_LABEL[preview?.role as ClientPortalRole] ?? preview?.role

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
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={signUpUrl}
            className="rounded-xl bg-[#9C77F5] px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Crear cuenta y aceptar
          </Link>
          <Link href={signInUrl} className="text-center text-sm text-[#7C3AED]">
            Ya tengo cuenta — iniciar sesión
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <p className="text-sm text-[#64748B]">
            Sesión: {userEmail}
            {preview && userEmail.toLowerCase() !== preview.email.toLowerCase() ? (
              <span className="mt-2 block text-amber-700">
                Debes usar el correo {preview.email} para aceptar esta invitación.
              </span>
            ) : null}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void accept()}
            className="mt-4 w-full rounded-xl bg-[#9C77F5] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Accediendo…' : 'Aceptar invitación'}
          </button>
        </div>
      )}
    </main>
  )
}
