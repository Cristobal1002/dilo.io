'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'
import { formatUsd, type SupportValueReportPreview } from '@/lib/support-value-report-shared'

type MonthOption = { value: string; label: string }
type TrendPoint = {
  month: string
  monthLabel: string
  totalCases: number
  totalHours: number
  improvements: number
  support: number
  estimatedValueUsd: number | null
}

type PreviewResponse = {
  preview: SupportValueReportPreview
  trend: TrendPoint[]
  monthOptions: MonthOption[]
  companyOptions: { id: string; name: string }[]
}

export default function SupportReportsPanel() {
  const [month, setMonth] = useState('')
  const [clientId, setClientId] = useState('')
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([])
  const [companyOptions, setCompanyOptions] = useState<{ id: string; name: string }[]>([])
  const [preview, setPreview] = useState<SupportValueReportPreview | null>(null)
  const [trend, setTrend] = useState<TrendPoint[] | null>(null)
  const [narrative, setNarrative] = useState('')
  const [sendTo, setSendTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [genBusy, setGenBusy] = useState(false)
  const [sendBusy, setSendBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const loadPreview = useCallback(async () => {
    if (!month) return
    setLoading(true)
    setMsg(null)
    try {
      const p = new URLSearchParams({ month })
      if (clientId.trim()) p.set('clientId', clientId.trim())
      const res = await fetch(`/api/support/reports/preview?${p}`)
      const r = await readApiResult<PreviewResponse>(res)
      if (!r.ok) {
        setMsg(r.message)
        setPreview(null)
        setTrend(null)
        return
      }
      setPreview(r.data.preview)
      setTrend(r.data.trend)
      setMonthOptions(r.data.monthOptions)
      setCompanyOptions(r.data.companyOptions)
    } finally {
      setLoading(false)
    }
  }, [month, clientId])

  useEffect(() => {
    const now = new Date()
    const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    setMonth(defaultMonth)
  }, [])

  useEffect(() => {
    if (month) void loadPreview()
  }, [month, clientId, loadPreview])

  const generateReport = async () => {
    setGenBusy(true)
    setMsg(null)
    setOkMsg(null)
    try {
      const res = await fetch('/api/support/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          clientId: clientId.trim() === '' ? null : clientId.trim(),
        }),
      })
      const r = await readApiResult<{
        narrativeMarkdown: string
        preview: SupportValueReportPreview
      }>(res)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setPreview(r.data.preview)
      setNarrative(r.data.narrativeMarkdown)
      setOkMsg('Informe generado. Revisa el texto, edítalo si hace falta y envíalo al cliente.')
    } finally {
      setGenBusy(false)
    }
  }

  const sendReport = async () => {
    const to = sendTo.trim()
    if (!to) {
      setMsg('Indica el correo del destinatario.')
      return
    }
    if (!narrative.trim()) {
      setMsg('Genera el informe antes de enviar.')
      return
    }
    setSendBusy(true)
    setMsg(null)
    setOkMsg(null)
    try {
      const res = await fetch('/api/support/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          to,
          narrativeMarkdown: narrative,
          clientId: clientId.trim() === '' ? null : clientId.trim(),
        }),
      })
      const r = await readApiResult<{ message: string }>(res)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setOkMsg(r.data.message)
    } finally {
      setSendBusy(false)
    }
  }

  const copyNarrative = async () => {
    if (!narrative.trim()) return
    try {
      await navigator.clipboard.writeText(narrative)
      setOkMsg('Texto copiado al portapapeles.')
    } catch {
      setMsg('No se pudo copiar.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-4 dark:border-[#2A2F3F] dark:bg-[#161821]">
        <p className="text-sm text-[#475569] dark:text-[#CBD5E1]">
          Agrupa casos <strong>cerrados o resueltos</strong> del mes con <strong>horas registradas</strong>.
          Configura tarifa y prompt en{' '}
          <Link href="/dashboard/account?tab=organization" className="font-semibold text-[#6B4DD4] hover:underline">
            Mi cuenta → Organización
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[160px] text-[10px] font-medium text-[#64748B]">
            Mes (UTC)
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[200px] flex-1 text-[10px] font-medium text-[#64748B]">
            Empresa (opcional)
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
            >
              <option value="">Todas las empresas</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={genBusy || loading || !preview?.totalCases}
            onClick={() => void generateReport()}
            className="rounded-xl bg-[#9C77F5] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {genBusy ? 'Generando…' : 'Generar informe con IA'}
          </button>
        </div>
      </div>

      {msg ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {msg}
        </p>
      ) : null}
      {okMsg ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {okMsg}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[#64748B]">Cargando resumen…</p>
      ) : preview ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E8EAEF] bg-white p-4 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
              <p className="text-[10px] font-semibold uppercase text-[#94A3B8]">Horas</p>
              <p className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">{preview.totalHours}</p>
            </div>
            <div className="rounded-xl border border-[#E8EAEF] bg-white p-4 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
              <p className="text-[10px] font-semibold uppercase text-[#94A3B8]">Casos</p>
              <p className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">{preview.totalCases}</p>
            </div>
            <div className="rounded-xl border border-[#E8EAEF] bg-white p-4 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
              <p className="text-[10px] font-semibold uppercase text-[#94A3B8]">Valor est.</p>
              <p className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">
                {formatUsd(preview.estimatedValueUsd)}
              </p>
              {!preview.hourlyRateUsd ? (
                <p className="mt-1 text-[10px] text-[#94A3B8]">Define tarifa USD/h en Organización</p>
              ) : null}
            </div>
          </div>

          {trend && trend.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
              <div className="border-b border-[#E8EAEF] px-4 py-3 text-xs font-semibold text-[#1A1A1A] dark:border-[#2A2F3F] dark:text-[#F8F9FB]">
                Tendencia (últimos 3 meses)
              </div>
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E8EAEF] text-[10px] font-semibold uppercase text-[#94A3B8] dark:border-[#2A2F3F]">
                    <th className="px-4 py-2">Mes</th>
                    <th className="px-4 py-2 text-right">Casos</th>
                    <th className="px-4 py-2 text-right">Horas</th>
                    <th className="px-4 py-2 text-right">Mejoras</th>
                    <th className="px-4 py-2 text-right">Soporte</th>
                    <th className="px-4 py-2 text-right">Valor est.</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((p) => (
                    <tr key={p.month} className="border-b border-[#E8EAEF]/60 dark:border-[#2A2F3F]/60">
                      <td className="px-4 py-2 font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">{p.monthLabel}</td>
                      <td className="px-4 py-2 text-right text-[#475569] dark:text-[#CBD5E1]">{p.totalCases}</td>
                      <td className="px-4 py-2 text-right text-[#475569] dark:text-[#CBD5E1]">{p.totalHours}</td>
                      <td className="px-4 py-2 text-right text-[#475569] dark:text-[#CBD5E1]">{p.improvements}</td>
                      <td className="px-4 py-2 text-right text-[#475569] dark:text-[#CBD5E1]">{p.support}</td>
                      <td className="px-4 py-2 text-right text-[#475569] dark:text-[#CBD5E1]">
                        {formatUsd(p.estimatedValueUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {preview.totalCases === 0 ? (
            <p className="text-sm text-[#64748B]">
              No hay casos con horas en {preview.monthLabel}. Cierra o resuelve casos y registra horas en la
              pestaña Casos.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E8EAEF] text-[10px] font-semibold uppercase text-[#94A3B8] dark:border-[#2A2F3F]">
                    <th className="px-3 py-2">Empresa</th>
                    <th className="px-3 py-2 text-right">Horas</th>
                    <th className="px-3 py-2 text-right">Casos</th>
                    <th className="px-3 py-2 text-right">Valor est.</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.companies.map((c) => (
                    <tr key={c.clientCompany} className="border-b border-[#E8EAEF]/60 dark:border-[#2A2F3F]/60">
                      <td className="px-3 py-2 font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">
                        {c.clientCompany}
                      </td>
                      <td className="px-3 py-2 text-right text-[#475569] dark:text-[#CBD5E1]">{c.totalHours}</td>
                      <td className="px-3 py-2 text-right text-[#475569] dark:text-[#CBD5E1]">{c.caseCount}</td>
                      <td className="px-3 py-2 text-right text-[#475569] dark:text-[#CBD5E1]">
                        {formatUsd(c.estimatedValueUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-2xl border border-[#E8EAEF] bg-white p-4 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB]">Texto del informe (editable)</p>
              <button
                type="button"
                disabled={!narrative.trim()}
                onClick={() => void copyNarrative()}
                className="rounded-lg border border-[#E8EAEF] px-3 py-1.5 text-xs font-medium dark:border-[#2A2F3F]"
              >
                Copiar
              </button>
            </div>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={14}
              placeholder="Pulsa «Generar informe con IA» para redactar el informe al cliente…"
              className="mt-3 min-h-[280px] w-full resize-y rounded-xl border border-[#E8EAEF] px-3 py-2 font-mono text-[13px] leading-relaxed dark:border-[#2A2F3F] dark:bg-[#252936]"
            />
            <label className="mt-4 block text-[10px] font-medium text-[#64748B]">
              Enviar por correo (Resend)
              <input
                type="email"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="cliente@empresa.com"
                className="mt-1 w-full max-w-md rounded-xl border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
              />
            </label>
            <button
              type="button"
              disabled={sendBusy || !narrative.trim()}
              onClick={() => void sendReport()}
              className="mt-3 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sendBusy ? 'Enviando…' : 'Enviar informe por email'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
