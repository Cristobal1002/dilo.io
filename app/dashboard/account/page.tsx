'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import {
  CheckCircleIcon,
  CheckIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { DiloPhoneField, isValidPhoneNumber } from '@/components/dilo-phone-field'

type DiloProfile = { name: string | null; email: string; phone: string | null }
type DiloSave = 'idle' | 'saving' | 'saved' | 'error'

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
      {children}
    </label>
  )
}

function providerLabel(provider: string) {
  const key = provider.replace(/oauth_|oidc_/i, '').toLowerCase()
  const map: Record<string, string> = {
    google: 'Google',
    github: 'GitHub',
    microsoft: 'Microsoft',
    facebook: 'Facebook',
    apple: 'Apple',
    discord: 'Discord',
  }
  return map[key] ?? provider.replace(/^oauth_/i, '')
}

function formatDate(d: Date | null | undefined) {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('es', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return '—'
  }
}

export default function DashboardAccountPage() {
  const { isLoaded, user } = useUser()
  const { session, isLoaded: sessionLoaded } = useSession()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [editing, setEditing] = useState(false)
  const [clerkSaving, setClerkSaving] = useState(false)
  const [clerkMsg, setClerkMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [diloProfile, setDiloProfile] = useState<DiloProfile | null>(null)
  const [diloPhone, setDiloPhone] = useState('')
  const [diloSave, setDiloSave] = useState<DiloSave>('idle')
  const [diloErr, setDiloErr] = useState('')

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
  }, [user])

  useEffect(() => {
    fetch('/api/settings/profile')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.user) {
          const u = res.data.user as DiloProfile
          setDiloProfile(u)
          setDiloPhone(u.phone ?? '')
        }
      })
      .catch(() => {})
  }, [])

  const primaryId = user?.primaryEmailAddress?.id

  const emails = useMemo(() => {
    if (!user?.emailAddresses?.length) return []
    return [...user.emailAddresses].sort((a, b) => {
      const ap = a.id === primaryId ? 1 : 0
      const bp = b.id === primaryId ? 1 : 0
      return bp - ap
    })
  }, [user?.emailAddresses, primaryId])

  const externals = user?.externalAccounts ?? []

  const passwordEnabled = Boolean(
    user && 'passwordEnabled' in user && (user as { passwordEnabled?: boolean }).passwordEnabled,
  )
  const twoFactorEnabled = Boolean(
    user && 'twoFactorEnabled' in user && (user as { twoFactorEnabled?: boolean }).twoFactorEnabled,
  )

  const saveClerkName = useCallback(async () => {
    if (!user) return
    setClerkSaving(true)
    setClerkMsg(null)
    try {
      await user.update({ firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined })
      await user.reload()
      setEditing(false)
      setClerkMsg({ type: 'ok', text: 'Nombre actualizado.' })
    } catch (e) {
      const text = e instanceof Error ? e.message : 'No se pudo guardar.'
      setClerkMsg({ type: 'err', text })
    } finally {
      setClerkSaving(false)
    }
  }, [user, firstName, lastName])

  const saveDiloProfile = useCallback(async () => {
    if (!user) return
    const dbName = diloProfile?.name?.trim()
    const clerkFull = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    const resolvedName =
      dbName ||
      clerkFull ||
      (user.username?.trim() ?? '') ||
      (user.primaryEmailAddress?.emailAddress?.split('@')[0]?.trim() ?? '')
    if (!resolvedName) {
      setDiloErr('No se pudo determinar un nombre para guardar.')
      setDiloSave('error')
      setTimeout(() => setDiloSave('idle'), 4000)
      return
    }
    setDiloSave('saving')
    setDiloErr('')
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: resolvedName,
          phone: diloPhone.trim() ? diloPhone.trim() : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Error al guardar')
      }
      setDiloSave('saved')
      setDiloProfile((p) =>
        p
          ? {
              ...p,
              name: resolvedName,
              phone: diloPhone.trim() || null,
            }
          : p,
      )
      setTimeout(() => setDiloSave('idle'), 2500)
    } catch (err) {
      setDiloErr(err instanceof Error ? err.message : 'Error al guardar')
      setDiloSave('error')
      setTimeout(() => setDiloSave('idle'), 4000)
    }
  }, [diloProfile, diloPhone, user])

  if (!isLoaded || !sessionLoaded) {
    return (
      <div className="mx-auto max-w-3xl px-2 py-10 md:px-4">
        <div className="h-6 w-40 animate-pulse rounded bg-[#E5E7EB] dark:bg-[#2A2F3F]" />
        <div className="mt-8 h-48 animate-pulse rounded-xl bg-[#E5E7EB] dark:bg-[#2A2F3F]" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const phoneInvalid = Boolean(diloPhone.trim()) && !isValidPhoneNumber(diloPhone.trim())

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-2 py-6 md:px-4">
      <div>
        <h1 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">Mi cuenta</h1>
        <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Datos de contacto, identidad y seguridad de tu cuenta.
        </p>
      </div>

      {clerkMsg ? (
        <p
          className={`flex items-center gap-2 text-sm ${clerkMsg.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          role="status"
        >
          {clerkMsg.type === 'ok' ? <CheckCircleIcon className="h-5 w-5 shrink-0" /> : null}
          {clerkMsg.text}
        </p>
      ) : null}

      <Card title="Identidad" description="Nombre y foto que ves al iniciar sesión.">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="shrink-0">
            {user.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.imageUrl}
                alt=""
                width={88}
                height={88}
                className="h-22 w-22 rounded-2xl border border-[#E5E7EB] object-cover dark:border-[#2A2F3F]"
              />
            ) : (
              <div className="flex h-22 w-22 items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] text-sm text-[#9CA3AF] dark:border-[#2A2F3F] dark:bg-[#252936]">
                Sin foto
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-medium text-[#111827] dark:text-[#F9FAFB]">
                {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Sin nombre'}
              </p>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#9C77F5] hover:bg-[#9C77F5]/10"
                >
                  <PencilSquareIcon className="h-4 w-4" aria-hidden />
                  Editar nombre
                </button>
              ) : null}
            </div>
            {editing ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <label className="block text-xs font-medium text-[#374151] dark:text-[#D1D5DB]" htmlFor="fn">
                    Nombre
                  </label>
                  <input
                    id="fn"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#9C77F5] focus:ring-2 focus:ring-[#9C77F5]/15 dark:border-[#374151] dark:bg-[#252936] dark:text-[#F9FAFB]"
                    placeholder="Nombre"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="block text-xs font-medium text-[#374151] dark:text-[#D1D5DB]" htmlFor="ln">
                    Apellidos
                  </label>
                  <input
                    id="ln"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#9C77F5] focus:ring-2 focus:ring-[#9C77F5]/15 dark:border-[#374151] dark:bg-[#252936] dark:text-[#F9FAFB]"
                    placeholder="Apellidos"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={clerkSaving}
                    onClick={() => void saveClerkName()}
                    className="rounded-lg bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#9C77F5]/25 disabled:opacity-50"
                  >
                    {clerkSaving ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    disabled={clerkSaving}
                    onClick={() => {
                      setFirstName(user.firstName ?? '')
                      setLastName(user.lastName ?? '')
                      setEditing(false)
                      setClerkMsg(null)
                    }}
                    className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] dark:border-[#2A2F3F] dark:text-[#9CA3AF] dark:hover:bg-[#252936]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
              La foto la suele aportar tu proveedor de acceso. Puedes alinear el nombre con el de arriba si lo deseas.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Correos electrónicos" description="Direcciones asociadas a tu cuenta de acceso.">
        <ul className="divide-y divide-[#F0EBFF] dark:divide-[#2A2F3F]">
          {emails.map((e) => {
            const primary = e.id === primaryId
            return (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-[#111827] dark:text-[#F9FAFB]">{e.emailAddress}</span>
                <div className="flex items-center gap-2">
                  {primary ? (
                    <span className="rounded-full bg-[#F3EEFF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5B2DC8] dark:bg-[#2A2F3F] dark:text-[#D4C4FC]">
                      Principal
                    </span>
                  ) : null}
                  {e.verification?.status && e.verification.status !== 'verified' ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Pendiente de verificar</span>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          Usamos el correo principal para avisos importantes.
        </p>
      </Card>

      <Card title="Teléfono" description="Número de contacto de tu organización; puedes editarlo aquí.">
        {!diloProfile ? (
          <div className="h-24 animate-pulse rounded-lg bg-[#F3F4F6] dark:bg-[#252936]" />
        ) : (
          <>
            <FieldLabel htmlFor="dilo-phone">Número</FieldLabel>
            <DiloPhoneField
              id="dilo-phone"
              variant="dashboard"
              value={diloPhone}
              onChange={setDiloPhone}
              placeholder="Número con código de país"
              aria-invalid={phoneInvalid}
            />
            {phoneInvalid ? (
              <p className="mt-1 text-xs text-[#EF4444]">Introduce un número válido con prefijo internacional.</p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void saveDiloProfile()}
                disabled={diloSave === 'saving' || !diloProfile || phoneInvalid}
                className="flex items-center gap-2 rounded-lg bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#9C77F5]/25 transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {diloSave === 'saving' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Guardando…
                  </>
                ) : diloSave === 'saved' ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Guardado
                  </>
                ) : (
                  'Guardar teléfono'
                )}
              </button>
              {diloSave === 'error' && diloErr ? (
                <span className="flex items-center gap-1.5 text-xs text-[#EF4444]">
                  <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
                  {diloErr}
                </span>
              ) : null}
            </div>
          </>
        )}
      </Card>

      <Card title="Cuentas conectadas" description="Proveedores con los que has iniciado sesión.">
        {externals.length === 0 ? (
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No hay cuentas sociales vinculadas.</p>
        ) : (
          <ul className="space-y-3">
            {externals.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFC] px-3 py-2.5 dark:border-[#2A2F3F] dark:bg-[#252936]"
              >
                <span className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB]">
                  {providerLabel(a.provider)}
                </span>
                <span className="truncate text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  {a.emailAddress ?? a.username ?? a.providerUserId ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Seguridad" description="Resumen de tu sesión. Sin eliminar cuenta desde aquí.">
        <dl className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EBFF] pb-4 dark:border-[#2A2F3F]">
            <dt className="text-[#6B7280] dark:text-[#9CA3AF]">Contraseña</dt>
            <dd className="font-medium text-[#111827] dark:text-[#F9FAFB]">
              {passwordEnabled ? 'Configurada' : 'Solo acceso social (sin contraseña local)'}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EBFF] pb-4 dark:border-[#2A2F3F]">
            <dt className="text-[#6B7280] dark:text-[#9CA3AF]">Verificación en dos pasos</dt>
            <dd className="font-medium text-[#111827] dark:text-[#F9FAFB]">{twoFactorEnabled ? 'Activada' : 'No activada'}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-[#6B7280] dark:text-[#9CA3AF]">Actividad de esta sesión</dt>
            <dd className="text-right font-medium text-[#111827] dark:text-[#F9FAFB]">
              {session?.lastActiveAt ? formatDate(session.lastActiveAt) : '—'}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          No ofrecemos eliminar la cuenta desde aquí. Si necesitas dar de baja la organización o el usuario, contacta
          con soporte.
        </p>
      </Card>
    </div>
  )
}
