'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { readApiResult } from '@/lib/read-api-result'
import {
  OUTREACH_FILTER_STATUSES,
  type OutreachFilterStatus,
  type OutreachStatus,
} from '@/lib/outreach'
import { cn } from '@/lib/utils'

const TRACKING_APP_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')) || 'https://getdilo.io'

function openPixelHref(token: string): string {
  return `${TRACKING_APP_BASE}/api/track/o/${encodeURIComponent(token)}`
}

function trackedClickHref(token: string, destinationHttps: string): string {
  return `${TRACKING_APP_BASE}/api/track/c/${encodeURIComponent(token)}?url=${encodeURIComponent(destinationHttps)}`
}

const STATUS_LABEL: Record<OutreachStatus, string> = {
  pending: 'Pendiente',
  sent: 'Enviado',
  opened: 'Abierto',
  clicked: 'Clic',
  replied: 'Respondió',
  meeting: 'Reunión',
  closed: 'Cerrado',
  lost: 'Perdido',
}

const FILTER_LABEL: Record<OutreachFilterStatus, string> = {
  all: 'Todos',
  pending: 'Pendiente',
  sent: 'Enviado',
  opened: 'Abierto',
  clicked: 'Clic',
  replied: 'Respondió',
  meeting: 'Reunión',
  closed: 'Cerrado',
  lost: 'Perdido',
}

function statusPillClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
    opened: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    clicked: 'bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
    replied: 'bg-purple-100 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200',
    meeting: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200',
    closed: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    lost: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  }
  return map[status] ?? map.pending
}

export type OutreachLeadOverview = {
  id: string
  name: string
  email: string
  company: string | null
  role: string | null
  status: string
  notes: string | null
  lastActivityAt: string | null
  createdAt: string
  updatedAt: string
  emailCount: number
  totalOpens: number
  totalClicks: number
  lastSentAt: string | null
}

type EmailRow = {
  id: string
  leadId: string
  trackingToken: string
  subject: string
  sentAt: string
  firstOpenedAt: string | null
  openCount: number
  firstClickedAt: string | null
  clickCount: number
  lastClickedUrl: string | null
  ctaDestinationUrl: string | null
  createdAt: string
}

export default function OutreachTable({ initialLeads }: { initialLeads: OutreachLeadOverview[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<OutreachFilterStatus>('all')
  const [leads, setLeads] = useState(initialLeads)

  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [creating, setCreating] = useState(false)

  const [panelLeadId, setPanelLeadId] = useState<string | null>(null)
  const [panelEmails, setPanelEmails] = useState<EmailRow[] | null>(null)
  const [panelLoading, setPanelLoading] = useState(false)
  const [registerSubject, setRegisterSubject] = useState('')
  const [registerCtaUrl, setRegisterCtaUrl] = useState('https://getdilo.io')
  const [registerBusy, setRegisterBusy] = useState(false)
  const [registerResult, setRegisterResult] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return leads
    return leads.filter((l) => l.status === filter)
  }, [leads, filter])

  const refreshList = useCallback(async () => {
    const qs = filter === 'all' ? '' : `?status=${encodeURIComponent(filter)}`
    const res = await fetch(`/api/outreach/leads${qs}`)
    const result = await readApiResult<{ leads: OutreachLeadOverview[] }>(res)
    if (result.ok) {
      setLeads(result.data.leads)
    }
    router.refresh()
  }, [filter, router])

  const openPanel = useCallback(async (leadId: string) => {
    setPanelLeadId(leadId)
    setPanelEmails(null)
    setRegisterSubject('')
    setRegisterCtaUrl('https://getdilo.io')
    setRegisterResult(null)
    setPanelLoading(true)
    try {
      const res = await fetch(`/api/outreach/leads/${leadId}`)
      const result = await readApiResult<{ lead: { id: string }; emails: EmailRow[] }>(res)
      if (result.ok) {
        setPanelEmails(result.data.emails)
      } else {
        setMsg(result.message)
        setPanelLeadId(null)
      }
    } finally {
      setPanelLoading(false)
    }
  }, [])

  const patchStatus = async (leadId: string, status: string) => {
    setBusyId(leadId)
    setMsg(null)
    try {
      const res = await fetch(`/api/outreach/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await readApiResult<{ lead: { status: string } }>(res)
      if (!result.ok) {
        setMsg(result.message)
        return
      }
      await refreshList()
    } finally {
      setBusyId(null)
    }
  }

  const createLead = async () => {
    setCreating(true)
    setMsg(null)
    try {
      const res = await fetch('/api/outreach/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          company: newCompany || null,
          role: newRole || null,
          notes: newNotes || null,
        }),
      })
      const result = await readApiResult<{ lead: OutreachLeadOverview }>(res)
      if (!result.ok) {
        setMsg(result.message)
        return
      }
      setNewOpen(false)
      setNewName('')
      setNewEmail('')
      setNewCompany('')
      setNewRole('')
      setNewNotes('')
      await refreshList()
    } finally {
      setCreating(false)
    }
  }

  const registerEmail = async () => {
    if (!panelLeadId || !registerSubject.trim()) return
    setRegisterBusy(true)
    setRegisterResult(null)
    try {
      const cta = registerCtaUrl.trim()
      const res = await fetch(`/api/outreach/leads/${panelLeadId}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: registerSubject.trim(),
          ...(cta ? { ctaDestinationUrl: cta } : {}),
        }),
      })
      const result = await readApiResult<{
        openPixelUrl: string
        trackedCtaUrl: string
        trackingToken: string
      }>(res)
      if (!result.ok) {
        setRegisterResult(result.message)
        return
      }
      setRegisterResult(
        `Pixel (img en el HTML):\n${result.data.openPixelUrl}\n\nLink CTA trackeado:\n${result.data.trackedCtaUrl}\n\nToken: ${result.data.trackingToken}`,
      )
      const detail = await fetch(`/api/outreach/leads/${panelLeadId}`)
      const d = await readApiResult<{ emails: EmailRow[] }>(detail)
      if (d.ok) setPanelEmails(d.data.emails)
      await refreshList()
    } finally {
      setRegisterBusy(false)
    }
  }

  const archiveLead = async (leadId: string) => {
    if (!confirm('¿Archivar este lead? Podrás crear otro con el mismo email.')) return
    setBusyId(leadId)
    try {
      const res = await fetch(`/api/outreach/leads/${leadId}`, { method: 'DELETE' })
      if (res.status === 204) {
        setPanelLeadId(null)
        await refreshList()
        return
      }
      const result = await readApiResult(res)
      if (!result.ok) setMsg(result.message)
    } finally {
      setBusyId(null)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    try {
      return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
    } catch {
      return '—'
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {msg ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {msg}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {OUTREACH_FILTER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                filter === s
                  ? 'bg-[#9C77F5]/20 text-[#6B4DD4] dark:bg-[#9C77F5]/25 dark:text-[#D4C4FC]'
                  : 'text-[#64748B] hover:bg-[#F1F5F9] dark:text-[#94A3B8] dark:hover:bg-[#252936]',
              )}
            >
              {FILTER_LABEL[s]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="rounded-full bg-[#9C77F5] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#8B6AE8]"
        >
          Nuevo lead
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[#E8EAEF] bg-[#FAFBFC] text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#94A3B8]">
            <tr>
              <th className="px-3 py-3">Lead</th>
              <th className="px-3 py-3">Empresa</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-center">Emails</th>
              <th className="px-3 py-3 text-center">Aperturas</th>
              <th className="px-3 py-3 text-center">Clics</th>
              <th className="px-3 py-3">Último contacto</th>
              <th className="px-3 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-[#64748B] dark:text-[#94A3B8]">
                  No hay leads con este filtro.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-[#F1F5F9] last:border-0 hover:bg-[#FAFBFC] dark:border-[#252936] dark:hover:bg-[#161821]"
                  onClick={() => void openPanel(row.id)}
                >
                  <td className="px-3 py-3">
                    <p className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">{row.name}</p>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{row.email}</p>
                  </td>
                  <td className="px-3 py-3 text-[#475569] dark:text-[#CBD5E1]">{row.company ?? '—'}</td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={row.status}
                      disabled={busyId === row.id}
                      onChange={(e) => void patchStatus(row.id, e.target.value)}
                      className={cn(
                        'max-w-36 rounded-lg border border-[#E8EAEF] px-2 py-1 text-xs font-semibold dark:border-[#2A2F3F] dark:bg-[#252936]',
                        statusPillClass(row.status),
                      )}
                    >
                      {(Object.keys(STATUS_LABEL) as OutreachStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">{row.emailCount}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{row.totalOpens}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{row.totalClicks}</td>
                  <td className="px-3 py-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {formatDate(row.lastActivityAt ?? row.lastSentAt)}
                  </td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => void archiveLead(row.id)}
                      disabled={busyId === row.id}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
                    >
                      Archivar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {newOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#E8EAEF] bg-white p-5 shadow-xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
            role="dialog"
            aria-modal
          >
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Nuevo lead</h2>
            <div className="mt-4 flex flex-col gap-3">
              <label className="block text-xs font-medium text-[#64748B]">
                Nombre
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                />
              </label>
              <label className="block text-xs font-medium text-[#64748B]">
                Email
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                />
              </label>
              <label className="block text-xs font-medium text-[#64748B]">
                Empresa
                <input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                />
              </label>
              <label className="block text-xs font-medium text-[#64748B]">
                Rol
                <input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                />
              </label>
              <label className="block text-xs font-medium text-[#64748B]">
                Notas
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-xl border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#252936]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={creating || !newName.trim() || !newEmail.trim()}
                onClick={() => void createLead()}
                className="rounded-full bg-[#9C77F5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {creating ? 'Guardando…' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {panelLeadId ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col border-l border-[#E8EAEF] bg-white shadow-2xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
            <div className="flex items-center justify-between border-b border-[#E8EAEF] px-4 py-3 dark:border-[#2A2F3F]">
              <h2 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Detalle</h2>
              <button
                type="button"
                onClick={() => setPanelLeadId(null)}
                className="rounded-lg px-2 py-1 text-sm text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#252936]"
              >
                Cerrar
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {panelLoading ? (
                <p className="text-sm text-[#64748B]">Cargando…</p>
              ) : (
                <>
                  <p className="text-xs text-[#94A3B8]">Historial de envíos</p>
                  <ul className="mt-2 space-y-2">
                    {(panelEmails ?? []).map((e) => (
                      <li
                        key={e.id}
                        className="rounded-xl border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F]"
                      >
                        <p className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">{e.subject}</p>
                        <p className="text-xs text-[#64748B]">Enviado {formatDate(e.sentAt)}</p>
                        <p className="mt-1 break-all font-mono text-[10px] leading-snug text-[#64748B]">
                          Pixel: {openPixelHref(e.trackingToken)}
                        </p>
                        {e.ctaDestinationUrl ? (
                          <p className="mt-1 break-all font-mono text-[10px] leading-snug text-[#64748B]">
                            CTA trackeado: {trackedClickHref(e.trackingToken, e.ctaDestinationUrl)}
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] leading-snug text-[#94A3B8]">
                            CTA trackeado: este envío no guardó destino (registros viejos). El pixel sigue arriba; para
                            clics, registra un envío nuevo indicando la URL del CTA.
                          </p>
                        )}
                        <p className="mt-1 text-xs text-[#64748B]">
                          Aperturas: {e.openCount}
                          {e.firstOpenedAt ? ` · primera ${formatDate(e.firstOpenedAt)}` : ''}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          Clics: {e.clickCount}
                          {e.firstClickedAt ? ` · primera ${formatDate(e.firstClickedAt)}` : ''}
                        </p>
                        {e.lastClickedUrl ? (
                          <p className="mt-1 truncate text-xs text-[#6B4DD4]" title={e.lastClickedUrl}>
                            Último clic: {e.lastClickedUrl}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 rounded-xl border border-dashed border-[#9C77F5]/35 bg-[#9C77F5]/5 p-3 dark:bg-[#9C77F5]/10">
                    <p className="text-xs font-semibold text-[#6B4DD4]">Registrar envío (antes de Resend)</p>
                    <p className="mt-1 text-[11px] leading-snug text-[#64748B]">
                      Crea el registro, copia el pixel y el link trackeado del CTA (se guardan para recuperarlos
                      después). Luego envía el HTML con Resend.
                    </p>
                    <label className="mt-2 block text-[10px] font-medium text-[#64748B]">
                      URL del CTA (https) — opcional; por defecto getdilo.io
                      <input
                        type="url"
                        value={registerCtaUrl}
                        onChange={(e) => setRegisterCtaUrl(e.target.value)}
                        placeholder="https://…"
                        className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-1.5 font-mono text-xs dark:border-[#2A2F3F] dark:bg-[#252936]"
                      />
                    </label>
                    <input
                      value={registerSubject}
                      onChange={(e) => setRegisterSubject(e.target.value)}
                      placeholder="Asunto del correo"
                      className="mt-2 w-full rounded-lg border border-[#E8EAEF] px-2 py-1.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                    />
                    <button
                      type="button"
                      disabled={registerBusy || !registerSubject.trim()}
                      onClick={() => void registerEmail()}
                      className="mt-2 w-full rounded-lg bg-[#0f172a] py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-[#334155]"
                    >
                      {registerBusy ? 'Creando…' : 'Registrar envío y ver URLs'}
                    </button>
                    {registerResult ? (
                      <textarea
                        readOnly
                        value={registerResult}
                        className="mt-2 h-40 w-full resize-y rounded-lg border border-[#E8EAEF] bg-[#FAFBFC] p-2 font-mono text-[10px] dark:border-[#2A2F3F] dark:bg-[#161821]"
                      />
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
