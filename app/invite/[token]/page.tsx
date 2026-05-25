'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'

type Preview = {
  email: string
  role: string
  organizationName: string
}

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadPreview = useCallback(async () => {
    const res = await fetch(`/api/invitations/${token}`)
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
      const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' })
      const r = await readApiResult<{ organizationName: string }>(res)
      if (!r.ok) {
        setError(r.message)
        return
      }
      router.replace('/dashboard')
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

  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(`/invite/${token}`)}`
  const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent(`/invite/${token}`)}`
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? ''

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F8F9FB]">
        Unirte a {preview?.organizationName}
      </h1>
      <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
        Invitación para <strong>{preview?.email}</strong> como {preview?.role === 'admin' ? 'admin' : 'miembro'}.
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
              <span className="block mt-2 text-amber-700">
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
            {busy ? 'Uniéndote…' : 'Aceptar invitación'}
          </button>
        </div>
      )}
    </main>
  )
}
