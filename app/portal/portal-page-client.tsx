'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PortalDashboardCases,
  PortalDashboardFooter,
  type PortalCaseItem,
} from '@/components/portal/dashboard/portal-dashboard-cases'
import {
  PortalDashboardHeader,
  type PortalTab,
} from '@/components/portal/dashboard/portal-dashboard-header'
import { PortalDashboardOverview } from '@/components/portal/dashboard/portal-dashboard-overview'
import { PortalThemeContext } from '@/components/portal/portal-theme-context'
import type { PortalDashboardStats } from '@/lib/portal-analytics'
import {
  persistPortalMarketingDark,
  readPortalMarketingDark,
} from '@/lib/landing-theme'
import { readApiResult } from '@/lib/read-api-result'
import { type ClientPortalRole } from '@/lib/client-portal-roles'
import { PORTAL_CLIENT_COOKIE } from '@/lib/portal-constants'

type PortalMe = {
  activeClientId: string
  memberships: { clientId: string; clientName: string; role: ClientPortalRole }[]
  branding: { clientName: string; providerName: string; logoUrl: string | null }
  user: { email: string; name: string | null }
}

function setClientCookie(clientId: string) {
  document.cookie = `${PORTAL_CLIENT_COOKIE}=${encodeURIComponent(clientId)}; path=/; max-age=31536000; samesite=lax`
}

export default function PortalPageClient() {
  const router = useRouter()
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<PortalTab>('overview')
  const [me, setMe] = useState<PortalMe | null>(null)
  const [stats, setStats] = useState<PortalDashboardStats | null>(null)
  const [cases, setCases] = useState<PortalCaseItem[]>([])
  const [role, setRole] = useState<ClientPortalRole>('viewer')
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  useEffect(() => {
    setIsDark(readPortalMarketingDark())
    setMounted(true)
  }, [])

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/portal/me')
    const r = await readApiResult<PortalMe>(res)
    if (!r.ok) throw new Error(r.message)
    setMe(r.data)
    setClientCookie(r.data.activeClientId)
    return r.data
  }, [])

  const loadDashboard = useCallback(async (clientId: string) => {
    const res = await fetch(`/api/portal/dashboard?clientId=${clientId}`)
    const r = await readApiResult<PortalDashboardStats>(res)
    if (!r.ok) throw new Error(r.message)
    setStats(r.data)
  }, [])

  const loadCases = useCallback(async (clientId: string, status: 'open' | 'all') => {
    const res = await fetch(`/api/portal/cases?status=${status}&clientId=${clientId}`)
    const r = await readApiResult<{ cases: PortalCaseItem[]; role: ClientPortalRole }>(res)
    if (!r.ok) throw new Error(r.message)
    setCases(r.data.cases)
    setRole(r.data.role)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const profile = await loadMe()
      await Promise.all([
        loadDashboard(profile.activeClientId),
        loadCases(profile.activeClientId, filter),
      ])
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al cargar'
      if (message.toLowerCase().includes('inicia sesión') || message.toLowerCase().includes('acceso')) {
        router.replace('/portal/entrar')
        return
      }
      setErr(message)
    } finally {
      setLoading(false)
    }
  }, [filter, loadCases, loadDashboard, loadMe, router])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!me) return
    void loadCases(me.activeClientId, filter)
  }, [filter, loadCases, me])

  const selected = cases.find((c) => c.id === selectedId) ?? null
  useEffect(() => {
    setNoteDraft(selected?.clientNotes ?? '')
  }, [selected])

  const logout = async () => {
    await fetch('/api/portal/auth/logout', { method: 'POST' })
    router.replace('/portal/entrar')
    router.refresh()
  }

  const switchClient = async (clientId: string) => {
    setClientCookie(clientId)
    setSelectedId(null)
    await refresh()
  }

  const patchCase = async (caseId: string, body: Record<string, unknown>) => {
    if (!me) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/portal/cases/${caseId}?clientId=${me.activeClientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const r = await readApiResult(res)
      if (!r.ok) throw new Error(r.message)
      await loadCases(me.activeClientId, filter)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  function toggleTheme() {
    setIsDark((d) => {
      const next = !d
      persistPortalMarketingDark(next)
      return next
    })
  }

  if (!mounted || (loading && !me)) {
    return (
      <div className="portal-dash-loading" style={{ background: isDark ? '#0D0720' : '#F4F1FF' }}>
        Cargando portal…
      </div>
    )
  }

  if (err && !me) {
    return (
      <main className="portal-dash-error-page">
        <p>{err}</p>
        <button type="button" onClick={() => router.replace('/portal/entrar')}>
          Volver a entrar
        </button>
      </main>
    )
  }

  if (!me) return null

  return (
    <PortalThemeContext.Provider value={{ isDark }}>
      <div
        className="portal-dash-root"
        style={{
          background: isDark ? '#0D0720' : '#F4F1FF',
          color: isDark ? '#fff' : '#111827',
        }}
      >
        <PortalDashboardHeader
          branding={me.branding}
          userEmail={me.user.email}
          userName={me.user.name}
          role={role}
          memberships={me.memberships}
          activeClientId={me.activeClientId}
          tab={tab}
          onTabChange={setTab}
          onSwitchClient={(id) => void switchClient(id)}
          onLogout={() => void logout()}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <main className="portal-dash-content">
          {tab === 'overview' && stats ? (
            <PortalDashboardOverview stats={stats} />
          ) : null}
          {tab === 'cases' ? (
            <PortalDashboardCases
              cases={cases}
              role={role}
              filter={filter}
              selectedId={selectedId}
              noteDraft={noteDraft}
              busy={busy}
              err={err}
              onFilterChange={setFilter}
              onSelect={setSelectedId}
              onNoteDraftChange={setNoteDraft}
              onPatch={(id, body) => void patchCase(id, body)}
            />
          ) : null}
          {tab === 'overview' && !stats && !loading ? (
            <p className="portal-dash-empty-center">No hay datos de resumen disponibles.</p>
          ) : null}
        </main>

        <PortalDashboardFooter />
      </div>
    </PortalThemeContext.Provider>
  )
}
