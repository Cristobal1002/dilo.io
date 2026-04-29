'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_OUTREACH_COLD_EMAIL_MARKDOWN } from '@/lib/outreach-cold-email-body'
import { readApiResult } from '@/lib/read-api-result'

type OrgPayload = {
  name: string
  logoUrl: string | null
  websiteUrl: string | null
  outreachColdEmailBodyMarkdown: string | null
  outreachColdEmailCtaLabel: string | null
}

export function OrganizationSettingsForm() {
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [outreachMarkdown, setOutreachMarkdown] = useState('')
  const [outreachCtaLabel, setOutreachCtaLabel] = useState('')
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
        setOutreachMarkdown(r.data.outreachColdEmailBodyMarkdown ?? '')
        setOutreachCtaLabel(r.data.outreachColdEmailCtaLabel ?? '')
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
          outreachColdEmailBodyMarkdown:
            outreachMarkdown.trim() === '' ? null : outreachMarkdown,
          outreachColdEmailCtaLabel:
            outreachCtaLabel.trim() === '' ? null : outreachCtaLabel.trim(),
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
      setOutreachMarkdown(r.data.outreachColdEmailBodyMarkdown ?? '')
      setOutreachCtaLabel(r.data.outreachColdEmailCtaLabel ?? '')
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

      <div className="mt-8 border-t border-[#E8EAEF] pt-6 dark:border-[#2A2F3F]">
        <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8F9FB]">
          Email de outreach en frío
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          Cuerpo en texto: párrafos separados por una línea en blanco; negrita con{' '}
          <code className="rounded bg-[#F3F4F6] px-1 dark:bg-[#252936]">**así**</code>. Placeholders:{' '}
          <code className="rounded bg-[#F3F4F6] px-1 dark:bg-[#252936]">{'{{recipient}}'}</code> (primer
          nombre), <code className="rounded bg-[#F3F4F6] px-1 dark:bg-[#252936]">{'{{recipient_full}}'}</code>.
          Vacío = plantilla por defecto de Dilo.
        </p>
        <label className="mt-3 block">
          <span className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">Cuerpo (markdown)</span>
          <textarea
            value={outreachMarkdown}
            onChange={(e) => setOutreachMarkdown(e.target.value)}
            rows={12}
            maxLength={12000}
            placeholder="Deja vacío para usar la plantilla por defecto…"
            className="mt-1.5 w-full resize-y rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2.5 font-mono text-[13px] leading-relaxed text-[#111827] outline-none ring-[#9C77F5]/30 focus:border-[#9C77F5]/40 focus:ring-2 dark:border-[#2A2F3F] dark:bg-[#151828] dark:text-[#F8F9FB]"
          />
          <span className="mt-1 block text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            {outreachMarkdown.length} / 12000
          </span>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOutreachMarkdown(DEFAULT_OUTREACH_COLD_EMAIL_MARKDOWN)}
          className="mt-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#4B5563] hover:bg-[#F8F9FB] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#9CA3AF] dark:hover:bg-[#252936]"
        >
          Insertar plantilla por defecto
        </button>
        <label className="mt-4 block">
          <span className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
            Texto del botón (CTA)
          </span>
          <input
            type="text"
            value={outreachCtaLabel}
            onChange={(e) => setOutreachCtaLabel(e.target.value)}
            maxLength={80}
            placeholder="Ver enlace →"
            className="mt-1.5 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2.5 text-sm text-[#111827] outline-none ring-[#9C77F5]/30 focus:border-[#9C77F5]/40 focus:ring-2 dark:border-[#2A2F3F] dark:bg-[#151828] dark:text-[#F8F9FB]"
          />
          <span className="mt-1 block text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            Vacío = «Ver enlace →». El enlace del pie usa tu sitio web (HTTPS) si lo configuraste arriba; si no,
            getdilo.io.
          </span>
        </label>
      </div>

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
