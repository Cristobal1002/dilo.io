'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
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
  /** Flow del último envío registrado (plantilla / “campaña”). */
  lastCampaignFlowId?: string | null
  lastCampaignFlowName?: string | null
}

export type OutreachFlowOption = {
  id: string
  name: string
  status: string
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
  flowId?: string | null
  resendEmailId?: string | null
  resendDeliveryStatus?: string | null
  resendBounceType?: string | null
  resendBounceMessage?: string | null
  resendDeliveryUpdatedAt?: string | null
  createdAt: string
}

function resendDeliveryLabel(status: string | null | undefined): string | null {
  if (!status) return null
  const map: Record<string, string> = {
    queued: 'Resend: en cola',
    sent: 'Resend: aceptado',
    delivered: 'Resend: entregado',
    bounced: 'Resend: rebotado',
    complained: 'Resend: marcado spam',
    failed: 'Resend: falló',
    delayed: 'Resend: entrega demorada',
  }
  return map[status] ?? `Resend: ${status}`
}

export default function OutreachTable({
  initialLeads,
  initialTotal,
  initialPage,
  pageSize,
  initialQ,
  initialFlowId,
  initialStatus,
  flowsForOutreach = [],
}: {
  initialLeads: OutreachLeadOverview[]
  initialTotal: number
  initialPage: number
  pageSize: number
  initialQ: string
  initialFlowId: string | null
  initialStatus: OutreachFilterStatus
  flowsForOutreach?: OutreachFlowOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [qDraft, setQDraft] = useState(initialQ)
  const [flowDraft, setFlowDraft] = useState(initialFlowId ?? '')

  useEffect(() => {
    setQDraft(initialQ)
    setFlowDraft(initialFlowId ?? '')
  }, [initialQ, initialFlowId])

  const totalPages = Math.max(1, Math.ceil(initialTotal / pageSize))

  const pushListUrl = useCallback(
    (next: { page?: number; q?: string; flow?: string | null; status?: OutreachFilterStatus }) => {
      const p = new URLSearchParams()
      const pageVal = next.page ?? initialPage
      const qVal = next.q !== undefined ? next.q : initialQ
      const flowVal = next.flow !== undefined ? next.flow : initialFlowId
      const statusVal = next.status ?? initialStatus
      const qTrim = qVal.trim()
      if (qTrim) p.set('q', qTrim)
      if (flowVal?.trim()) p.set('flow', flowVal.trim())
      if (statusVal !== 'all') p.set('status', statusVal)
      if (pageVal > 1) p.set('page', String(pageVal))
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
      router.refresh()
    },
    [initialPage, initialQ, initialFlowId, initialStatus, pathname, router],
  )
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
  const [panelLead, setPanelLead] = useState<OutreachLeadOverview | null>(null)
  const [panelEmails, setPanelEmails] = useState<EmailRow[] | null>(null)
  const [panelLoading, setPanelLoading] = useState(false)
  const [editLeadOpen, setEditLeadOpen] = useState(false)
  const [editLeadBusy, setEditLeadBusy] = useState(false)
  const [editLeadMsg, setEditLeadMsg] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [registerSubject, setRegisterSubject] = useState('')
  const [registerFlowId, setRegisterFlowId] = useState('')
  const [registerCtaUrl, setRegisterCtaUrl] = useState('')
  const [sendWithResend, setSendWithResend] = useState(true)
  const [registerBusy, setRegisterBusy] = useState(false)
  const [registerResult, setRegisterResult] = useState<string | null>(null)

  function normalizeCtaUrlInput(input: string): string {
    const raw = input.trim()
    if (!raw) return ''
    // Si pegaron encima de algo y quedó concatenado, quedarnos con la última URL completa.
    const lastHttps = raw.toLowerCase().lastIndexOf('https://')
    const lastHttp = raw.toLowerCase().lastIndexOf('http://')
    const idx = Math.max(lastHttps, lastHttp)
    if (idx > 0) return raw.slice(idx)
    return raw
  }

  const flowNameById = useMemo(
    () => new Map(flowsForOutreach.map((f) => [f.id, f.name] as const)),
    [flowsForOutreach],
  )

  const refreshList = useCallback(() => {
    router.refresh()
  }, [router])

  const openPanel = useCallback(async (leadId: string) => {
    setPanelLeadId(leadId)
    setPanelLead(null)
    setPanelEmails(null)
    setEditLeadOpen(false)
    setEditLeadBusy(false)
    setEditLeadMsg(null)
    setRegisterSubject('')
    setRegisterFlowId('')
    setRegisterCtaUrl('')
    setSendWithResend(true)
    setRegisterResult(null)
    setPanelLoading(true)
    try {
      const res = await fetch(`/api/outreach/leads/${leadId}`)
      const result = await readApiResult<{
        lead: OutreachLeadOverview
        emails: EmailRow[]
        lastCampaignFlowId?: string | null
        lastCampaignFlowName?: string | null
      }>(res)
      if (result.ok) {
        setPanelLead({
          ...result.data.lead,
          lastCampaignFlowId: result.data.lastCampaignFlowId ?? null,
          lastCampaignFlowName: result.data.lastCampaignFlowName ?? null,
        })
        setEditName(result.data.lead.name ?? '')
        setEditEmail(result.data.lead.email ?? '')
        setEditCompany(result.data.lead.company ?? '')
        setEditRole(result.data.lead.role ?? '')
        setEditNotes(result.data.lead.notes ?? '')
        setPanelEmails(result.data.emails)
      } else {
        setMsg(result.message)
        setPanelLeadId(null)
      }
    } finally {
      setPanelLoading(false)
    }
  }, [])

  const saveLeadEdits = async () => {
    if (!panelLeadId || !panelLead) return
    setEditLeadBusy(true)
    setEditLeadMsg(null)
    try {
      const res = await fetch(`/api/outreach/leads/${panelLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          company: editCompany.trim() === '' ? null : editCompany.trim(),
          role: editRole.trim() === '' ? null : editRole.trim(),
          notes: editNotes.trim() === '' ? null : editNotes.trim(),
        }),
      })
      const result = await readApiResult<{ lead: OutreachLeadOverview }>(res)
      if (!result.ok) {
        setEditLeadMsg(result.message)
        return
      }
      setPanelLead(result.data.lead)
      setEditLeadOpen(false)
      await refreshList()
    } finally {
      setEditLeadBusy(false)
    }
  }

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
          sendWithResend,
          ...(registerFlowId.trim() ? { flowId: registerFlowId.trim() } : {}),
          ...(cta ? { ctaDestinationUrl: cta } : {}),
        }),
      })
      const result = await readApiResult<{
        openPixelUrl: string
        trackedCtaUrl: string
        trackingToken: string
        emailSent?: boolean
      }>(res)
      if (!result.ok) {
        setRegisterResult(result.message)
        return
      }
      setRegisterResult(
        [
          result.data.emailSent
            ? 'Correo enviado con Resend (integración del workspace o servidor).'
            : 'Solo registro en Dilo (sin envío). Puedes copiar el HTML y enviar con otra herramienta.',
          '',
          `Pixel (img en el HTML):\n${result.data.openPixelUrl}`,
          '',
          `Link CTA trackeado:\n${result.data.trackedCtaUrl}`,
          '',
          `Token: ${result.data.trackingToken}`,
        ].join('\n'),
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

      <div className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-4 dark:border-[#2A2F3F] dark:bg-[#161821]">
        <p className="text-xs font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">Buscar y campaña</p>
        <p className="mt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
          Filtra por nombre o email, y por flow usado en algún envío (plantilla en Conectores). Los filtros actualizan
          la URL para poder compartir o guardar la vista.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[180px] flex-1 text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
            Nombre o email
            <input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  pushListUrl({ page: 1, q: qDraft, flow: flowDraft || null, status: initialStatus })
                }
              }}
              placeholder="Ej. María o @dominio.com"
              className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
            />
          </label>
          <label className="block min-w-[200px] flex-1 text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
            Campaña (flow con envío)
            <select
              value={flowDraft}
              onChange={(e) => setFlowDraft(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
            >
              <option value="">Todas las campañas</option>
              {flowsForOutreach.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.status === 'published' ? '' : ` · ${f.status}`}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                pushListUrl({ page: 1, q: qDraft, flow: flowDraft || null, status: initialStatus })
              }
              className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white dark:bg-[#334155]"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                setQDraft('')
                setFlowDraft('')
                pushListUrl({ page: 1, q: '', flow: null, status: initialStatus })
              }}
              className="rounded-xl border border-[#E8EAEF] bg-white px-4 py-2 text-sm font-semibold text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {OUTREACH_FILTER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pushListUrl({ status: s, page: 1 })}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                initialStatus === s
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

      <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
        Mostrando {initialLeads.length} de {initialTotal} leads
        {totalPages > 1 ? ` · página ${initialPage} de ${totalPages}` : null}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
        <table className="w-full min-w-[1020px] text-left text-sm">
          <thead className="border-b border-[#E8EAEF] bg-[#FAFBFC] text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#94A3B8]">
            <tr>
              <th className="px-3 py-3">Lead</th>
              <th className="px-3 py-3">Empresa</th>
              <th className="px-3 py-3">Campaña</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-center">Emails</th>
              <th className="px-3 py-3 text-center">Aperturas</th>
              <th className="px-3 py-3 text-center">Clics</th>
              <th className="px-3 py-3">Último contacto</th>
              <th className="px-3 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {initialLeads.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-[#64748B] dark:text-[#94A3B8]">
                  No hay leads con este filtro.
                </td>
              </tr>
            ) : (
              initialLeads.map((row) => (
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
                  <td className="max-w-[200px] px-3 py-3 text-xs text-[#475569] dark:text-[#CBD5E1]">
                    {row.lastCampaignFlowName ? (
                      <span className="line-clamp-2 font-medium text-[#334155] dark:text-[#E2E8F0]">
                        {row.lastCampaignFlowName}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8]">Workspace / sin flow</span>
                    )}
                  </td>
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

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={initialPage <= 1}
            onClick={() => pushListUrl({ page: initialPage - 1 })}
            className="rounded-xl border border-[#E8EAEF] bg-white px-4 py-2 text-sm font-semibold text-[#334155] disabled:opacity-40 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#CBD5E1]"
          >
            ← Anterior
          </button>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Página {initialPage} de {totalPages}
          </p>
          <button
            type="button"
            disabled={initialPage >= totalPages}
            onClick={() => pushListUrl({ page: initialPage + 1 })}
            className="rounded-xl border border-[#E8EAEF] bg-white px-4 py-2 text-sm font-semibold text-[#334155] disabled:opacity-40 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#CBD5E1]"
          >
            Siguiente →
          </button>
        </div>
      ) : null}

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
                  {panelLead ? (
                    <div className="mb-5 rounded-xl border border-[#E8EAEF] p-3 dark:border-[#2A2F3F]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">
                            {panelLead.name}
                          </p>
                          <p className="truncate text-xs text-[#64748B] dark:text-[#94A3B8]">{panelLead.email}</p>
                          <p className="mt-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                            <span className="font-semibold text-[#334155] dark:text-[#CBD5E1]">Campaña: </span>
                            {panelLead.lastCampaignFlowName ?? 'Workspace / sin flow en el último envío'}
                          </p>
                          {panelLead.company ? (
                            <p className="mt-1 truncate text-xs text-[#64748B] dark:text-[#94A3B8]">
                              {panelLead.company}
                              {panelLead.role ? ` · ${panelLead.role}` : ''}
                            </p>
                          ) : panelLead.role ? (
                            <p className="mt-1 truncate text-xs text-[#64748B] dark:text-[#94A3B8]">{panelLead.role}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditLeadOpen((v) => !v)}
                          className="shrink-0 rounded-lg border border-[#E8EAEF] bg-white px-2 py-1 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:hover:bg-[#252936]"
                        >
                          {editLeadOpen ? 'Cerrar edición' : 'Editar'}
                        </button>
                      </div>

                      {editLeadOpen ? (
                        <div className="mt-3 space-y-2">
                          {editLeadMsg ? (
                            <p className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                              {editLeadMsg}
                            </p>
                          ) : null}
                          <label className="block text-[10px] font-medium text-[#64748B]">
                            Nombre
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-1.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                            />
                          </label>
                          <label className="block text-[10px] font-medium text-[#64748B]">
                            Email
                            <input
                              type="email"
                              inputMode="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-1.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] font-medium text-[#64748B]">
                              Empresa
                              <input
                                value={editCompany}
                                onChange={(e) => setEditCompany(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-1.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                              />
                            </label>
                            <label className="block text-[10px] font-medium text-[#64748B]">
                              Rol
                              <input
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-1.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                              />
                            </label>
                          </div>
                          <label className="block text-[10px] font-medium text-[#64748B]">
                            Notas
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              rows={3}
                              className="mt-1 w-full resize-y rounded-lg border border-[#E8EAEF] px-2 py-1.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                            />
                          </label>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              disabled={editLeadBusy}
                              onClick={() => {
                                setEditLeadOpen(false)
                                setEditLeadMsg(null)
                                setEditName(panelLead.name ?? '')
                                setEditEmail(panelLead.email ?? '')
                                setEditCompany(panelLead.company ?? '')
                                setEditRole(panelLead.role ?? '')
                                setEditNotes(panelLead.notes ?? '')
                              }}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-50 dark:hover:bg-[#252936]"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={editLeadBusy || !editName.trim() || !editEmail.trim()}
                              onClick={() => void saveLeadEdits()}
                              className="rounded-lg bg-[#9C77F5] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                            >
                              {editLeadBusy ? 'Guardando…' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <p className="text-xs text-[#94A3B8]">Historial de envíos</p>
                  <ul className="mt-2 space-y-2">
                    {(panelEmails ?? []).map((e) => (
                      <li
                        key={e.id}
                        className="rounded-xl border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F]"
                      >
                        <p className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">{e.subject}</p>
                        <p className="text-xs text-[#64748B]">Enviado {formatDate(e.sentAt)}</p>
                        {e.resendDeliveryStatus ? (
                          <p className="mt-1 text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                            {resendDeliveryLabel(e.resendDeliveryStatus)}
                            {e.resendDeliveryUpdatedAt ? (
                              <span className="font-normal text-[#94A3B8]">
                                {' '}
                                · {formatDate(e.resendDeliveryUpdatedAt)}
                              </span>
                            ) : null}
                          </p>
                        ) : e.resendEmailId ? (
                          <p className="mt-1 text-xs text-[#94A3B8]">Resend: esperando evento de entrega…</p>
                        ) : null}
                        {e.resendDeliveryStatus === 'bounced' && (e.resendBounceMessage || e.resendBounceType) ? (
                          <p className="mt-1 text-[11px] leading-snug text-red-700 dark:text-red-300">
                            {e.resendBounceType ? <span className="font-semibold">{e.resendBounceType}. </span> : null}
                            {e.resendBounceMessage ?? ''}
                          </p>
                        ) : null}
                        <p className="mt-1 break-all font-mono text-[10px] leading-snug text-[#64748B]">
                          Pixel: {openPixelHref(e.trackingToken)}
                        </p>
                        {e.flowId ? (
                          <p className="mt-1 text-[10px] text-[#64748B]">
                            Plantilla (flow):{' '}
                            <span className="font-semibold text-[#334155] dark:text-[#CBD5E1]">
                              {flowNameById.get(e.flowId) ?? e.flowId.slice(0, 8) + '…'}
                            </span>
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] text-[#94A3B8]">Plantilla: workspace (sin flow)</p>
                        )}
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
                    <p className="text-xs font-semibold text-[#6B4DD4]">Registrar envío</p>
                    <p className="mt-1 text-[11px] leading-snug text-[#64748B]">
                      Crea el registro con pixel y CTA trackeados. Opcionalmente Dilo envía el cold mail con la cuenta
                      Resend del workspace (Integraciones). Si eliges un flow, el cuerpo del mail puede usar la
                      plantilla definida en <span className="font-semibold">Conectores de ese flow</span> (si no, la
                      del workspace).
                    </p>
                    <label className="mt-2 block text-[10px] font-medium text-[#64748B]">
                      Flow (opcional) — plantilla cold por flow
                      <select
                        value={registerFlowId}
                        disabled={registerBusy || flowsForOutreach.length === 0}
                        onChange={(e) => {
                          const id = e.target.value
                          setRegisterFlowId(id)
                          if (!id) return
                          const f = flowsForOutreach.find((x) => x.id === id)
                          if (f?.status === 'published') {
                            setRegisterCtaUrl(`${TRACKING_APP_BASE}/f/${id}`)
                          }
                        }}
                        className="mt-1 w-full rounded-lg border border-[#E8EAEF] bg-white px-2 py-1.5 text-xs dark:border-[#2A2F3F] dark:bg-[#252936]"
                      >
                        <option value="">Sin flow (solo plantilla del workspace)</option>
                        {flowsForOutreach.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                            {f.status === 'published' ? '' : ` · ${f.status}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-2 block text-[10px] font-medium text-[#64748B]">
                      URL del CTA (https) — opcional; si la dejas vacía usamos getdilo.io
                      <input
                        type="url"
                        value={registerCtaUrl}
                        onChange={(e) => setRegisterCtaUrl(normalizeCtaUrlInput(e.target.value))}
                        placeholder="https://…"
                        className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-1.5 font-mono text-xs dark:border-[#2A2F3F] dark:bg-[#252936]"
                      />
                    </label>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-[#94A3B8]">
                        Tip: pega el link del flow publicado (por ejemplo <span className="font-mono">/f/…</span>).
                      </p>
                      <button
                        type="button"
                        disabled={registerBusy}
                        onClick={() => setRegisterCtaUrl('')}
                        className="shrink-0 rounded-md border border-[#E8EAEF] bg-white px-2 py-1 text-[10px] font-semibold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:hover:bg-[#252936]"
                      >
                        Limpiar
                      </button>
                    </div>
                    <input
                      value={registerSubject}
                      onChange={(e) => setRegisterSubject(e.target.value)}
                      placeholder="Asunto del correo"
                      className="mt-2 w-full rounded-lg border border-[#E8EAEF] px-2 py-1.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                    />
                    <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-[#475569] dark:text-[#94A3B8]">
                      <input
                        type="checkbox"
                        checked={sendWithResend}
                        onChange={(e) => setSendWithResend(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#CBD5E1] text-[#6B4DD4] focus:ring-[#9C77F5]"
                      />
                      <span>
                        <strong className="text-[#1A1A1A] dark:text-[#F8F9FB]">Enviar ahora</strong> con Resend
                        (Integraciones → Resend del workspace, o <span className="font-mono">RESEND_*</span> en
                        servidor). Si lo desmarcas, solo queda el registro y las URLs para copiar.
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={registerBusy || !registerSubject.trim()}
                      onClick={() => void registerEmail()}
                      className="mt-2 w-full rounded-lg bg-[#0f172a] py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-[#334155]"
                    >
                      {registerBusy ? 'Procesando…' : sendWithResend ? 'Registrar y enviar' : 'Registrar y ver URLs'}
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
