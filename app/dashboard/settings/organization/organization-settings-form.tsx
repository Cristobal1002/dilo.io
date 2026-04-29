'use client'

import { useCallback, useEffect, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'

type OrgPayload = {
  name: string
  logoUrl: string | null
  websiteUrl: string | null
}

export function OrganizationSettingsForm() {
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/organization')
      const r = await readApiResult<OrgPayload>(res)
      if (r.ok) {
        setName(r.data.name)
        setLogoUrl(r.data.logoUrl ?? '')
        setWebsiteUrl(r.data.websiteUrl ?? '')
      } else {
        setMsg(r.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: logoUrl.trim() === '' ? null : logoUrl.trim(),
          websiteUrl: websiteUrl.trim() === '' ? null : websiteUrl.trim(),
        }),
      })
      const r = await readApiResult<OrgPayload>(res)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setName(r.data.name)
      setLogoUrl(r.data.logoUrl ?? '')
      setWebsiteUrl(r.data.websiteUrl ?? '')
      setMsg('Guardado.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">Cargando…</p>
  }

  const preview =
    logoUrl.trim() && /^https:\/\//i.test(logoUrl.trim()) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl.trim()}
        alt=""
        className="mt-3 h-12 max-h-12 w-auto max-w-[220px] rounded-lg border border-[#E8EAEF] bg-white object-contain p-1 dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
      />
    ) : null

  return (
    <form onSubmit={save} className="rounded-2xl border border-[#E8EAEF] bg-white p-5 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
      <label className="block">
        <span className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">Nombre del workspace</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={200}
          className="mt-1.5 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2.5 text-sm text-[#111827] outline-none ring-[#9C77F5]/30 focus:border-[#9C77F5]/40 focus:ring-2 dark:border-[#2A2F3F] dark:bg-[#151828] dark:text-[#F8F9FB]"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
          URL del logo (HTTPS, opcional)
        </span>
        <input
          type="url"
          inputMode="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…"
          className="mt-1.5 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2.5 text-sm text-[#111827] outline-none ring-[#9C77F5]/30 focus:border-[#9C77F5]/40 focus:ring-2 dark:border-[#2A2F3F] dark:bg-[#151828] dark:text-[#F8F9FB]"
        />
        <span className="mt-1 block text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          Debe ser <code className="rounded bg-[#F3F4F6] px-1 dark:bg-[#252936]">https://</code>. Si un flow tiene su
          propio logo en ajustes, ese tiene prioridad.
        </span>
      </label>
      {preview}

      <label className="mt-5 block">
        <span className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">Sitio web (HTTPS, opcional)</span>
        <input
          type="url"
          inputMode="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://tu-dominio.com"
          className="mt-1.5 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2.5 text-sm text-[#111827] outline-none ring-[#9C77F5]/30 focus:border-[#9C77F5]/40 focus:ring-2 dark:border-[#2A2F3F] dark:bg-[#151828] dark:text-[#F8F9FB]"
        />
      </label>

      {msg ? (
        <p
          className={`mt-4 text-sm ${msg === 'Guardado.' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
        >
          {msg}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-linear-to-r from-[#9C77F5] to-[#7B5BD4] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F8F9FB] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#9CA3AF] dark:hover:bg-[#252936]"
        >
          Descartar cambios
        </button>
      </div>
    </form>
  )
}
