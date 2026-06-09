'use client'

import Link from 'next/link'
import { SignOutButton, useAuth, useUser } from '@clerk/nextjs'
import { portalSignInUrl, portalSignUpUrl } from '@/lib/auth-redirect'

type Props = {
  returnPath?: string
  title?: string
  description?: string
  /** Si la sesión activa no coincide con el correo de acceso esperado. */
  expectedEmail?: string | null
}

export function PortalAuthPrompt({
  returnPath = '/portal',
  title = 'Portal de soporte',
  description,
  expectedEmail,
}: Props) {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const sessionEmail = user?.primaryEmailAddress?.emailAddress ?? ''
  const signInUrl = portalSignInUrl(returnPath)
  const signUpUrl = portalSignUpUrl(returnPath)
  const emailMismatch =
    Boolean(expectedEmail) &&
    isSignedIn &&
    sessionEmail.toLowerCase() !== expectedEmail!.trim().toLowerCase()

  if (!isLoaded) {
    return <p className="text-sm text-[#64748B]">Comprobando sesión…</p>
  }

  if (emailMismatch) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Estás conectado como <strong>{sessionEmail}</strong>. Para continuar usa{' '}
          <strong>{expectedEmail}</strong>.
        </p>
        <SignOutButton redirectUrl={signInUrl}>
          <button
            type="button"
            className="rounded-xl bg-[#9C77F5] px-4 py-3 text-sm font-semibold text-white"
          >
            Cerrar sesión e iniciar con el correo correcto
          </button>
        </SignOutButton>
      </div>
    )
  }

  if (isSignedIn && !emailMismatch) {
    return (
      <p className="mt-4 text-sm text-[#64748B]">
        Sesión: <strong>{sessionEmail}</strong>
      </p>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {description ? <p className="text-sm text-[#64748B]">{description}</p> : null}
      <Link
        href={signUpUrl}
        className="rounded-xl bg-[#9C77F5] px-4 py-3 text-center text-sm font-semibold text-white"
      >
        Crear cuenta con mi correo de acceso
      </Link>
      <Link href={signInUrl} className="text-center text-sm text-[#7C3AED]">
        Ya tengo cuenta — iniciar sesión
      </Link>
      <p className="text-[11px] text-[#94A3B8]">
        Usa el mismo correo que te dio tu proveedor de soporte ({title.toLowerCase()}).
      </p>
    </div>
  )
}
