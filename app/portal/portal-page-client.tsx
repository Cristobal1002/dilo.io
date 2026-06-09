'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { readApiResult } from '@/lib/read-api-result'
import {
  CLIENT_PORTAL_ROLE_LABEL,
  canPortalEditNotes,
  canPortalEditPriority,
  type ClientPortalRole,
} from '@/lib/client-portal-roles'
import {
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_STATUS_LABEL,
  supportPriorityPillClass,
  supportStatusPillClass,
  type SupportPriority,
  type SupportStatus,
} from '@/lib/support'
import { PORTAL_CLIENT_COOKIE } from '@/lib/portal-constants'
import { cn } from '@/lib/utils'

type PortalCase = {
  id: string
  caseNumber: number
  subject: string
  description: string | null
  status: SupportStatus
  priority: SupportPriority
  reportedPriority: SupportPriority
  type: string
  requesterName: string | null
  requesterEmail: string | null
  clientNotes: string | null
  resolutionNotes: string | null
  dueAt: string | null
  lastActivityAt: string
  createdAt: string
}

type PortalMe = {
  activeClientId: string
  memberships: { clientId: string; clientName: string; role: ClientPortalRole }[]
  branding: { clientName: string; providerName: string; logoUrl: string | null }
  user: { email: string; name: string | null }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function setClientCookie(clientId: string) {
  document.cookie = `${PORTAL_CLIENT_COOKIE}=${encodeURIComponent(clientId)}; path=/; max-age=31536000; samesite=lax`
}

export default function PortalPageClient() {
  const [me, setMe] = useState<PortalMe | null>(null)
  const [cases, setCases] = useState<PortalCase[]>([])
  const [role, setRole] = useState<ClientPortalRole>('viewer')
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/portal/me')
    const r = await readApiResult<PortalMe>(res)
    if (!r.ok) throw new Error(r.message)
    setMe(r.data)
    setClientCookie(r.data.activeClientId)
    return r.data
  }, [])

  const loadCases = useCallback(async (clientId: string, status: 'open' | 'all') => {
    const res = await fetch(`/api/portal/cases?status=${status}&clientId=${clientId}`)
    const r = await readApiResult<{ cases: PortalCase[]; role: ClientPortalRole }>(res)
    if (!r.ok) throw new Error(r.message)
    setCases(r.data.cases)
    setRole(r.data.role)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const profile = await loadMe()
      await loadCases(profile.activeClientId, filter)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [filter, loadCases, loadMe])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selected = useMemo(
    () => cases.find((c) => c.id === selectedId) ?? null,
    [cases, selectedId],
  )

  useEffect(() => {
    setNoteDraft(selected?.clientNotes ?? '')
  }, [selected])

  const switchClient = async (clientId: string) => {
    setClientCookie(clientId)
    setSelectedId(null)
    await refresh()
  }

  const patchCase = async (caseId: string, body: Record<string, unknown>) => {
    setBusy(true)
    setErr(null)
    try {
      const clientId = me?.activeClientId ?? ''
      const res = await fetch(`/api/portal/cases/${caseId}?clientId=${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const r = await readApiResult(res)
      if (!r.ok) throw new Error(r.message)
      await loadCases(clientId, filter)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !me) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-[#64748B]">
        Cargando portal…
      </main>
    )
  }

  if (err && !me) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-red-600">{err}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-[#7C3AED]">
          Ir al inicio
        </Link>
      </main>
    )
  }

  const logoUrl = me?.branding.logoUrl

  return (
    <div className="min-h-screen bg-[#FAFBFC] dark:bg-[#0F1117]">
      <header className="border-b border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-9 max-w-[140px] object-contain" />
            ) : (
              <span className="text-lg font-bold text-[#7C3AED]">Dilo</span>
            )}
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-[#F8F9FB]">
                {me?.branding.clientName}
              </p>
              <p className="text-xs text-[#64748B]">Soporte · {me?.branding.providerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(me?.memberships.length ?? 0) > 1 ? (
              <select
                value={me?.activeClientId}
                onChange={(e) => void switchClient(e.target.value)}
                className="rounded-lg border border-[#E8EAEF] bg-white px-2 py-1.5 text-xs dark:border-[#2A2F3F] dark:bg-[#252936]"
              >
                {me?.memberships.map((m) => (
                  <option key={m.clientId} value={m.clientId}>
                    {m.clientName}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="hidden text-xs text-[#64748B] sm:inline">
              {CLIENT_PORTAL_ROLE_LABEL[role]}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-semibold text-[#111827] dark:text-[#F8F9FB]">Casos de soporte</h1>
            <div className="flex gap-2">
              {(['open', 'all'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    filter === f
                      ? 'bg-[#7C3AED] text-white'
                      : 'bg-white text-[#64748B] border border-[#E8EAEF] dark:bg-[#252936] dark:border-[#2A2F3F]',
                  )}
                >
                  {f === 'open' ? 'Abiertos' : 'Todos'}
                </button>
              ))}
            </div>
          </div>

          {err ? <p className="mb-3 text-sm text-red-600">{err}</p> : null}

          <div className="overflow-hidden rounded-xl border border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
            {cases.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#64748B]">No hay casos en esta vista.</p>
            ) : (
              <ul className="divide-y divide-[#E8EAEF] dark:divide-[#2A2F3F]">
                {cases.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition hover:bg-[#F8F9FB] dark:hover:bg-[#252936]',
                        selectedId === c.id && 'bg-[#F5F3FF] dark:bg-[#2A2540]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-[#64748B]">#{c.caseNumber}</p>
                          <p className="font-medium text-[#111827] dark:text-[#F8F9FB]">{c.subject}</p>
                          <p className="mt-1 text-xs text-[#64748B]">
                            {c.requesterName ?? '—'} · {formatDate(c.lastActivityAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', supportStatusPillClass(c.status))}>
                            {SUPPORT_STATUS_LABEL[c.status]}
                          </span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', supportPriorityPillClass(c.priority))}>
                            {SUPPORT_PRIORITY_LABEL[c.priority]}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="rounded-xl border border-[#E8EAEF] bg-white p-4 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
          {!selected ? (
            <p className="text-sm text-[#64748B]">Selecciona un caso para ver detalle.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#64748B]">Caso #{selected.caseNumber}</p>
                <h2 className="text-base font-semibold text-[#111827] dark:text-[#F8F9FB]">{selected.subject}</h2>
              </div>
              {selected.description ? (
                <p className="text-sm text-[#475569] dark:text-[#CBD5E1] whitespace-pre-wrap">{selected.description}</p>
              ) : null}
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[#94A3B8]">Estado</dt>
                  <dd>{SUPPORT_STATUS_LABEL[selected.status]}</dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Urgencia reportada</dt>
                  <dd>{SUPPORT_PRIORITY_LABEL[selected.reportedPriority]}</dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Entrega estimada</dt>
                  <dd>{formatDate(selected.dueAt)}</dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Solicitante</dt>
                  <dd>{selected.requesterName ?? '—'}</dd>
                </div>
              </dl>

              {canPortalEditPriority(role) ? (
                <div>
                  <label className="mb-1 block text-xs font-medium">Prioridad operativa</label>
                  <select
                    value={selected.priority}
                    disabled={busy}
                    onChange={(e) => void patchCase(selected.id, { priority: e.target.value })}
                    className={cn(
                      'w-full rounded-lg border border-[#E8EAEF] px-2 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]',
                      supportPriorityPillClass(selected.priority),
                    )}
                  >
                    {SUPPORT_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {SUPPORT_PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-[#94A3B8]">Prioridad operativa</p>
                  <p className="text-sm font-medium">{SUPPORT_PRIORITY_LABEL[selected.priority]}</p>
                </div>
              )}

              {selected.resolutionNotes && (selected.status === 'resolved' || selected.status === 'closed') ? (
                <div>
                  <p className="text-xs font-medium text-[#94A3B8]">Resolución</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selected.resolutionNotes}</p>
                </div>
              ) : null}

              {canPortalEditNotes(role) ? (
                <div>
                  <label className="mb-1 block text-xs font-medium">Nota para el equipo</label>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchCase(selected.id, { clientNotes: noteDraft })}
                    className="mt-2 rounded-lg bg-[#7C3AED] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Guardar nota
                  </button>
                </div>
              ) : selected.clientNotes ? (
                <div>
                  <p className="text-xs font-medium text-[#94A3B8]">Nota del cliente</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selected.clientNotes}</p>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
