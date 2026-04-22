'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function SettingsCard({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29] p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5"
    >
      {children}
    </label>
  )
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
}: {
  id: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  readOnly?: boolean
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`
        w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors
        ${readOnly
          ? 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280] cursor-default dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#9CA3AF]'
          : 'border-[#D1D5DB] bg-white text-[#111827] dark:border-[#374151] dark:bg-[#252936] dark:text-[#F9FAFB] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15'
        }
      `}
    />
  )
}

type ProfileData = { name: string; email: string; phone: string }

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch('/api/settings/profile')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.user) {
          const u = res.data.user as ProfileData
          setProfile(u)
          setName(u.name ?? '')
          setPhone(u.phone ?? '')
        }
      })
      .catch(() => {/* silently ignore */})
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    setSaveState('saving')
    setErrorMsg('')

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Error al guardar')
      }

      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar')
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 4000)
    }
  }, [name, phone])

  if (!profile) {
    return (
      <div className="max-w-2xl space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-[#F3F4F6] dark:bg-[#252936] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">Perfil</h1>
        <p className="mt-0.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Tu información personal y de contacto.
        </p>
      </div>

      <SettingsCard title="Información personal">
        <div className="space-y-4">
          <div>
            <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
            <TextInput
              id="name"
              value={name}
              onChange={setName}
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
            <TextInput
              id="phone"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="+57 300 000 0000"
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Correo electrónico"
        description="Tu correo de acceso a Dilo. Para cambiarlo contáctanos."
      >
        <TextInput id="email" value={profile.email} readOnly />
      </SettingsCard>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveState === 'saving' || !name.trim()}
          className="
            flex items-center gap-2 rounded-lg bg-[#7C3AED] px-5 py-2.5 text-sm font-medium text-white
            transition-all hover:bg-[#6D28D9] active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {saveState === 'saving' ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Guardando…
            </>
          ) : saveState === 'saved' ? (
            <>
              <CheckIcon className="h-4 w-4" />
              Guardado
            </>
          ) : (
            'Guardar cambios'
          )}
        </button>

        {saveState === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-[#EF4444]">
            <ExclamationCircleIcon className="h-4 w-4" />
            {errorMsg}
          </span>
        )}
      </div>
    </div>
  )
}
