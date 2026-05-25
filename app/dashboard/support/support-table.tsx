'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { readApiResult } from '@/lib/read-api-result'
import {
  SUPPORT_ASSIGNEE_FILTERS,
  SUPPORT_FILTER_STATUSES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUS_LABEL,
  SUPPORT_STATUSES,
  SUPPORT_CLIENT_APPROVAL_LABEL,
  SUPPORT_TYPE_LABEL,
  SUPPORT_TYPES,
  isSupportClientApprovalStatus,
  supportPriorityPillClass,
  supportStatusPillClass,
  type SupportClientApprovalStatus,
  type SupportAssigneeFilter,
  type SupportCaseType,
  type SupportFilterStatus,
  type SupportPriority,
  type SupportStatus,
} from '@/lib/support'
import { cn } from '@/lib/utils'

const FILTER_STATUS_LABEL: Record<SupportFilterStatus, string> = {
  all: 'Todos',
  new: 'Nuevos',
  in_progress: 'En curso',
  waiting: 'En espera',
  resolved: 'Resueltos',
  closed: 'Cerrados',
}

const ASSIGNEE_LABEL: Record<SupportAssigneeFilter, string> = {
  all: 'Todos',
  me: 'Asignados a mí',
  unassigned: 'Sin asignar',
}

export type SupportCaseOverview = {
  id: string
  caseNumber: number
  status: string
  priority: string
  type: string
  subject: string
  requesterName: string | null
  requesterEmail: string | null
  clientCompany: string | null
  flowId: string | null
  flowName: string | null
  assignedUserId: string | null
  assigneeName: string | null
  lastActivityAt: string
  createdAt: string
  updatedAt: string
}

export type SupportFlowOption = {
  id: string
  name: string
  status: string
}

type TeamMember = { id: string; name: string | null; email: string }

type CaseDetail = {
  id: string
  caseNumber: number
  status: string
  priority: string
  type: string
  subject: string
  description: string | null
  requesterName: string | null
  requesterEmail: string | null
  requesterPhone: string | null
  clientCompany: string | null
  flowId: string | null
  sessionId: string | null
  assignedUserId: string | null
  internalNotes: string | null
  resolutionNotes: string | null
  hoursSpent: number | null
  dueAt: string | null
  clientApprovalStatus: string | null
  clientFeedback: string | null
  submittedForApprovalAt: string | null
  lastActivityAt: string
  createdAt: string
}

export default function SupportTable({
  initialCases,
  initialTotal,
  initialPage,
  pageSize,
  initialQ,
  initialFlowId,
  initialStatus,
  initialAssignee,
  flowsForSupport = [],
}: {
  initialCases: SupportCaseOverview[]
  initialTotal: number
  initialPage: number
  pageSize: number
  initialQ: string
  initialFlowId: string | null
  initialStatus: SupportFilterStatus
  initialAssignee: SupportAssigneeFilter
  flowsForSupport?: SupportFlowOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [qDraft, setQDraft] = useState(initialQ)
  const [flowDraft, setFlowDraft] = useState(initialFlowId ?? '')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [saveOkMsg, setSaveOkMsg] = useState<string | null>(null)

  const [panelCaseId, setPanelCaseId] = useState<string | null>(null)
  const [panelCase, setPanelCase] = useState<CaseDetail | null>(null)
  const [panelFlowName, setPanelFlowName] = useState<string | null>(null)
  const [panelSessionSummary, setPanelSessionSummary] = useState<string | null>(null)
  const [panelLoading, setPanelLoading] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [editResolution, setEditResolution] = useState('')
  const [editHours, setEditHours] = useState('')
  const [editDueAt, setEditDueAt] = useState('')
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [approvalBusy, setApprovalBusy] = useState(false)

  useEffect(() => {
    setQDraft(initialQ)
    setFlowDraft(initialFlowId ?? '')
  }, [initialQ, initialFlowId])

  useEffect(() => {
    fetch('/api/settings/team')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data.members)) {
          setMembers(
            res.data.members.map((m: { id: string; name: string | null; email: string }) => ({
              id: m.id,
              name: m.name,
              email: m.email,
            })),
          )
        }
      })
      .catch(() => {})
  }, [])

  const totalPages = Math.max(1, Math.ceil(initialTotal / pageSize))

  const pushListUrl = useCallback(
    (next: {
      page?: number
      q?: string
      flow?: string | null
      status?: SupportFilterStatus
      assignee?: SupportAssigneeFilter
    }) => {
      const p = new URLSearchParams()
      const pageVal = next.page ?? initialPage
      const qVal = next.q !== undefined ? next.q : initialQ
      const flowVal = next.flow !== undefined ? next.flow : initialFlowId
      const statusVal = next.status ?? initialStatus
      const assigneeVal = next.assignee ?? initialAssignee
      const qTrim = qVal.trim()
      if (qTrim) p.set('q', qTrim)
      if (flowVal?.trim()) p.set('flow', flowVal.trim())
      if (statusVal !== 'all') p.set('status', statusVal)
      if (assigneeVal !== 'all') p.set('assignee', assigneeVal)
      if (pageVal > 1) p.set('page', String(pageVal))
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
      router.refresh()
    },
    [initialPage, initialQ, initialFlowId, initialStatus, initialAssignee, pathname, router],
  )

  const refreshList = useCallback(() => router.refresh(), [router])

  const openPanel = useCallback(async (caseId: string) => {
    setPanelCaseId(caseId)
    setPanelCase(null)
    setPanelLoading(true)
    setMsg(null)
    setSaveOkMsg(null)
    try {
      const res = await fetch(`/api/support/cases/${caseId}`)
      const result = await readApiResult<{
        case: CaseDetail
        flowName: string | null
        sessionSummary: string | null
        reviewUrl: string | null
      }>(res)
      if (!result.ok) {
        setMsg(result.message)
        setPanelCaseId(null)
        return
      }
      const c = result.data.case
      setPanelCase(c)
      setPanelFlowName(result.data.flowName)
      setPanelSessionSummary(result.data.sessionSummary)
      setReviewUrl(result.data.reviewUrl)
      setEditNotes(c.internalNotes ?? '')
      setEditResolution(c.resolutionNotes ?? '')
      setEditHours(c.hoursSpent != null ? String(c.hoursSpent) : '')
      setEditDueAt(toDatetimeLocal(c.dueAt))
    } finally {
      setPanelLoading(false)
    }
  }, [])

  const patchCase = async (caseId: string, body: Record<string, unknown>) => {
    setBusyId(caseId)
    setMsg(null)
    try {
      const res = await fetch(`/api/support/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await readApiResult<{ case: CaseDetail }>(res)
      if (!result.ok) {
        setMsg(result.message)
        return false
      }
      if (panelCaseId === caseId) {
        const c = result.data.case
        setPanelCase(c)
        setEditNotes(c.internalNotes ?? '')
        setEditResolution(c.resolutionNotes ?? '')
        setEditHours(c.hoursSpent != null ? String(c.hoursSpent) : '')
        setEditDueAt(toDatetimeLocal(c.dueAt))
      }
      await refreshList()
      return true
    } finally {
      setBusyId(null)
    }
  }

  function toDatetimeLocal(iso: string | null | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function parseDeliveryFields(): { ok: true; hoursSpent: number | null; dueAt: string | null } | { ok: false; message: string } {
    const hours = editHours.trim() === '' ? null : parseFloat(editHours)
    if (hours !== null && (Number.isNaN(hours) || hours < 0)) {
      return { ok: false, message: 'Horas inválidas' }
    }
    if (editDueAt.trim() === '') {
      return { ok: true, hoursSpent: hours, dueAt: null }
    }
    const d = new Date(editDueAt)
    if (!Number.isFinite(d.getTime())) {
      return { ok: false, message: 'Fecha de entrega inválida. Revisa el campo de fecha y hora.' }
    }
    return { ok: true, hoursSpent: hours, dueAt: d.toISOString() }
  }

  const saveDeliveryAndTime = async () => {
    if (!panelCaseId) return
    setSaveBusy(true)
    setMsg(null)
    setSaveOkMsg(null)
    try {
      const parsed = parseDeliveryFields()
      if (!parsed.ok) {
        setMsg(parsed.message)
        return
      }
      const ok = await patchCase(panelCaseId, {
        hoursSpent: parsed.hoursSpent,
        dueAt: parsed.dueAt,
      })
      if (ok) {
        setSaveOkMsg('Horas y fecha de entrega guardadas.')
      }
    } catch {
      setMsg('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaveBusy(false)
    }
  }

  const saveCaseNotes = async () => {
    if (!panelCaseId || !panelCase) return
    const prevLen = panelCase.resolutionNotes?.length ?? 0
    const nextLen = editResolution.trim().length
    if (prevLen > 80 && nextLen < prevLen * 0.5) {
      const ok = window.confirm(
        'El texto de entrega quedó mucho más corto que lo guardado antes. ¿Guardar igual?',
      )
      if (!ok) return
    }
    setSaveBusy(true)
    setMsg(null)
    setSaveOkMsg(null)
    try {
      const ok = await patchCase(panelCaseId, {
        internalNotes: editNotes.trim() === '' ? null : editNotes,
        resolutionNotes: editResolution.trim() === '' ? null : editResolution,
      })
      if (ok) {
        setSaveOkMsg('Notas guardadas.')
      }
    } catch {
      setMsg('No se pudo guardar las notas.')
    } finally {
      setSaveBusy(false)
    }
  }

  const requestClientApproval = async () => {
    if (!panelCaseId) return
    setApprovalBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/support/cases/${panelCaseId}/request-approval`, { method: 'POST' })
      const result = await readApiResult<{
        reviewUrl: string
        emailSent: boolean
        message: string
      }>(res)
      if (!result.ok) {
        setMsg(result.message)
        return
      }
      setReviewUrl(result.data.reviewUrl)
      setMsg(result.data.message)
      await openPanel(panelCaseId)
      await refreshList()
    } finally {
      setApprovalBusy(false)
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

  const hasSupportFlow = useMemo(
    () => flowsForSupport.some((f) => f.status === 'published'),
    [flowsForSupport],
  )

  return (
    <div className="flex flex-col gap-4">
      {msg ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {msg}
        </p>
      ) : null}
      {saveOkMsg ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {saveOkMsg}
        </p>
      ) : null}

      <div className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-4 dark:border-[#2A2F3F] dark:bg-[#161821]">
        <p className="text-xs font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">Buscar</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[180px] flex-1 text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
            Asunto, cliente o #
            <input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  pushListUrl({ page: 1, q: qDraft, flow: flowDraft || null })
                }
              }}
              placeholder="Ej. 12 o error exportar"
              className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
            />
          </label>
          <label className="block min-w-[200px] flex-1 text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
            Flow de origen
            <select
              value={flowDraft}
              onChange={(e) => setFlowDraft(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
            >
              <option value="">Todos los flows</option>
              {flowsForSupport.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.status === 'published' ? '' : ` · ${f.status}`}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => pushListUrl({ page: 1, q: qDraft, flow: flowDraft || null })}
            className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white dark:bg-[#334155]"
          >
            Aplicar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {SUPPORT_FILTER_STATUSES.map((s) => (
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
            {FILTER_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {SUPPORT_ASSIGNEE_FILTERS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => pushListUrl({ assignee: a, page: 1 })}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              initialAssignee === a
                ? 'border-[#9C77F5]/28 bg-[#9C77F5]/10 text-[#5B3FC9] dark:border-[#9C77F5]/35 dark:bg-[#9C77F5]/14 dark:text-[#E9D5FF]'
                : 'border-transparent text-[#64748B] hover:bg-black/4 dark:text-[#94A3B8] dark:hover:bg-white/5',
            )}
          >
            {ASSIGNEE_LABEL[a]}
          </button>
        ))}
      </div>

      <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
        Mostrando {initialCases.length} de {initialTotal} casos
        {totalPages > 1 ? ` · página ${initialPage} de ${totalPages}` : null}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-[#E8EAEF] bg-[#FAFBFC] text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#94A3B8]">
            <tr>
              <th className="px-3 py-3">Caso</th>
              <th className="px-3 py-3">Empresa</th>
              <th className="px-3 py-3">Solicitante</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Prioridad</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Asignado</th>
              <th className="px-3 py-3">Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {initialCases.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center">
                  <p className="text-[#64748B] dark:text-[#94A3B8]">No hay casos con este filtro.</p>
                  {!hasSupportFlow ? (
                    <p className="mt-3 text-sm">
                      <Link
                        href="/dashboard/flows/new"
                        className="font-semibold text-[#6B4DD4] hover:underline dark:text-[#D4C4FC]"
                      >
                        Crear flow desde plantilla «Solicitud de soporte»
                      </Link>
                      , publícalo y comparte el enlace con tus clientes.
                    </p>
                  ) : null}
                </td>
              </tr>
            ) : (
              initialCases.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-[#F1F5F9] last:border-0 hover:bg-[#FAFBFC] dark:border-[#252936] dark:hover:bg-[#161821]"
                  onClick={() => void openPanel(row.id)}
                >
                  <td className="px-3 py-3">
                    <p className="font-mono text-xs font-bold text-[#9C77F5]">#{row.caseNumber}</p>
                    <p className="mt-0.5 font-medium text-[#1A1A1A] line-clamp-2 dark:text-[#F8F9FB]">
                      {row.subject}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-[#1A1A1A] dark:text-[#F8F9FB]">
                    {row.clientCompany ?? '—'}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-[#1A1A1A] dark:text-[#F8F9FB]">{row.requesterName ?? '—'}</p>
                    {row.requesterEmail ? (
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{row.requesterEmail}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-xs text-[#475569] dark:text-[#CBD5E1]">
                    {SUPPORT_TYPE_LABEL[row.type as SupportCaseType] ?? row.type}
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={row.priority}
                      disabled={busyId === row.id}
                      onChange={(e) => void patchCase(row.id, { priority: e.target.value })}
                      className={cn(
                        'rounded-lg border border-[#E8EAEF] px-2 py-1 text-xs font-semibold dark:border-[#2A2F3F] dark:bg-[#252936]',
                        supportPriorityPillClass(row.priority),
                      )}
                    >
                      {SUPPORT_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p === 'low' ? 'Baja' : p === 'high' ? 'Alta' : 'Media'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={row.status}
                      disabled={busyId === row.id}
                      onChange={(e) => void patchCase(row.id, { status: e.target.value })}
                      className={cn(
                        'max-w-36 rounded-lg border border-[#E8EAEF] px-2 py-1 text-xs font-semibold dark:border-[#2A2F3F] dark:bg-[#252936]',
                        supportStatusPillClass(row.status),
                      )}
                    >
                      {SUPPORT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {SUPPORT_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-xs text-[#475569] dark:text-[#CBD5E1]">
                    {row.assigneeName ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {formatDate(row.lastActivityAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={initialPage <= 1}
            onClick={() => pushListUrl({ page: initialPage - 1 })}
            className="rounded-lg border border-[#E8EAEF] px-3 py-1.5 text-sm disabled:opacity-40 dark:border-[#2A2F3F]"
          >
            Anterior
          </button>
          <span className="text-xs text-[#64748B]">
            {initialPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={initialPage >= totalPages}
            onClick={() => pushListUrl({ page: initialPage + 1 })}
            className="rounded-lg border border-[#E8EAEF] px-3 py-1.5 text-sm disabled:opacity-40 dark:border-[#2A2F3F]"
          >
            Siguiente
          </button>
        </div>
      ) : null}

      {panelCaseId ? (
        <div
          className="fixed inset-0 z-[200] flex justify-end bg-black/30"
          role="presentation"
          onClick={() => setPanelCaseId(null)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col border-l border-[#E8EAEF] bg-white shadow-2xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
            role="dialog"
            aria-label="Detalle del caso"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8EAEF] px-4 py-3 dark:border-[#2A2F3F]">
              <p className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">
                {panelCase ? `Caso #${panelCase.caseNumber}` : 'Caso'}
              </p>
              <button
                type="button"
                onClick={() => setPanelCaseId(null)}
                className="text-[#94A3B8] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB]"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {panelLoading || !panelCase ? (
                <p className="text-sm text-[#64748B]">Cargando…</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">
                      {panelCase.subject}
                    </h2>
                    {panelCase.description ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[#475569] dark:text-[#CBD5E1]">
                        {panelCase.description}
                      </p>
                    ) : null}
                    {panelSessionSummary && !panelCase.description ? (
                      <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">{panelSessionSummary}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-2 text-xs">
                    <p>
                      <span className="text-[#94A3B8]">Empresa (organización):</span>{' '}
                      {panelCase.clientCompany ?? '—'}
                    </p>
                    <p>
                      <span className="text-[#94A3B8]">Solicitante (persona):</span>{' '}
                      {panelCase.requesterName ?? '—'}
                      {panelCase.requesterEmail ? ` · ${panelCase.requesterEmail}` : ''}
                      {panelCase.requesterPhone ? ` · ${panelCase.requesterPhone}` : ''}
                    </p>
                    {panelFlowName ? (
                      <p>
                        <span className="text-[#94A3B8]">Flow:</span> {panelFlowName}
                      </p>
                    ) : null}
                    <p>
                      <span className="text-[#94A3B8]">Fecha de solicitud:</span>{' '}
                      {formatDate(panelCase.createdAt)}
                    </p>
                    {panelCase.hoursSpent != null || panelCase.dueAt ? (
                      <p>
                        <span className="text-[#94A3B8]">Registrado:</span>{' '}
                        {panelCase.hoursSpent != null ? `${panelCase.hoursSpent} h` : ''}
                        {panelCase.hoursSpent != null && panelCase.dueAt ? ' · ' : ''}
                        {panelCase.dueAt ? `entrega ${formatDate(panelCase.dueAt)}` : ''}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-[#E8EAEF] p-3 dark:border-[#2A2F3F]">
                    <p className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB]">
                      Tiempo y entrega
                    </p>
                    <label className="mt-3 block text-[10px] font-medium text-[#64748B]">
                      Horas dedicadas (tu equipo)
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={editHours}
                        onChange={(e) => setEditHours(e.target.value)}
                        placeholder="Ej. 2.5"
                        className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                      />
                    </label>
                    <label className="mt-3 block text-[10px] font-medium text-[#64748B]">
                      Fecha de entrega comprometida
                      <input
                        type="datetime-local"
                        value={editDueAt}
                        onChange={(e) => setEditDueAt(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-[#9C77F5]/20 bg-[#9C77F5]/5 p-3 dark:border-[#9C77F5]/30">
                    <p className="text-xs font-semibold text-[#5B3FC9] dark:text-[#D4C4FC]">
                      Aprobación del solicitante
                    </p>
                    {panelCase.clientApprovalStatus &&
                    isSupportClientApprovalStatus(panelCase.clientApprovalStatus) ? (
                      <p className="mt-1 text-sm text-[#374151] dark:text-[#D1D5DB]">
                        {SUPPORT_CLIENT_APPROVAL_LABEL[panelCase.clientApprovalStatus]}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-[#64748B]">Aún no enviado a revisión</p>
                    )}
                    {panelCase.clientFeedback ? (
                      <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                        Comentario: {panelCase.clientFeedback}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={approvalBusy || panelCase.clientApprovalStatus === 'pending'}
                      onClick={() => void requestClientApproval()}
                      className="mt-3 w-full rounded-lg bg-[#7C3AED] py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {approvalBusy
                        ? 'Enviando…'
                        : panelCase.clientApprovalStatus === 'changes_requested'
                          ? 'Reenviar a aprobación'
                          : 'Pedir aprobación al cliente'}
                    </button>
                    {reviewUrl ? (
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(reviewUrl)}
                        className="mt-2 w-full rounded-lg border border-[#E8EAEF] py-2 text-xs font-medium dark:border-[#2A2F3F]"
                      >
                        Copiar enlace de revisión
                      </button>
                    ) : null}
                  </div>

                  <label className="block text-[10px] font-medium text-[#64748B]">
                    Estado interno
                    <select
                      value={panelCase.status}
                      disabled={busyId === panelCase.id}
                      onChange={(e) => void patchCase(panelCase.id, { status: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                    >
                      {SUPPORT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {SUPPORT_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-[10px] font-medium text-[#64748B]">
                    Asignado a
                    <select
                      value={panelCase.assignedUserId ?? ''}
                      disabled={busyId === panelCase.id}
                      onChange={(e) =>
                        void patchCase(panelCase.id, {
                          assignedUserId: e.target.value === '' ? null : e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                    >
                      <option value="">Sin asignar</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name?.trim() || m.email}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-[10px] font-medium text-[#64748B]">
                    Tipo
                    <select
                      value={panelCase.type}
                      disabled={busyId === panelCase.id}
                      onChange={(e) => void patchCase(panelCase.id, { type: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-[#E8EAEF] px-2 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                    >
                      {SUPPORT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {SUPPORT_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-xl border border-[#E8EAEF] p-3 dark:border-[#2A2F3F]">
                    <p className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB]">Notas del caso</p>
                    <label className="mt-3 block text-[10px] font-medium text-[#64748B]">
                      Notas internas (solo tu equipo)
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={4}
                        className="mt-1 min-h-[88px] w-full resize-y rounded-lg border border-[#E8EAEF] px-2 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                      />
                    </label>

                    <label className="mt-3 block text-[10px] font-medium text-[#64748B]">
                      Qué entregaste (el cliente ve esto al aprobar)
                      <textarea
                        value={editResolution}
                        onChange={(e) => setEditResolution(e.target.value)}
                        rows={10}
                        className="mt-1 min-h-[200px] w-full resize-y rounded-lg border border-[#E8EAEF] px-2 py-2 text-sm leading-relaxed dark:border-[#2A2F3F] dark:bg-[#252936]"
                      />
                      <span className="mt-1 block text-[10px] text-[#94A3B8]">
                        {editResolution.length} / 8000 caracteres
                      </span>
                    </label>
                    {panelCase.resolutionNotes && panelCase.resolutionNotes !== editResolution ? (
                      <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-300">
                        Tienes cambios sin guardar en la descripción de entrega.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={saveBusy}
                      onClick={() => void saveCaseNotes()}
                      className="mt-3 w-full rounded-xl border border-[#9C77F5] py-2.5 text-sm font-semibold text-[#6B4DD4] disabled:opacity-50 dark:text-[#D4C4FC]"
                    >
                      {saveBusy ? 'Guardando…' : 'Guardar notas'}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={saveBusy}
                    onClick={() => void saveDeliveryAndTime()}
                    className="w-full rounded-xl bg-[#9C77F5] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saveBusy ? 'Guardando…' : 'Guardar horas y fecha de entrega'}
                  </button>

                  {panelCase.flowId && panelCase.sessionId ? (
                    <Link
                      href={`/dashboard/flows/${panelCase.flowId}/results/${panelCase.sessionId}`}
                      className="block text-center text-sm font-semibold text-[#6B4DD4] hover:underline dark:text-[#D4C4FC]"
                    >
                      Ver respuestas de la sesión →
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
