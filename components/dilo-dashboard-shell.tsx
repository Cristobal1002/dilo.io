'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  EllipsisVerticalIcon,
  EnvelopeOpenIcon,
  FolderOpenIcon,
  MoonIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  Squares2X2Icon,
  SunIcon,
  UserCircleIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { PLAN_LABELS, PLAN_COLORS, isPlan } from '@/lib/plan-limits'
import { SparklesIcon as SparklesIconSolid } from '@heroicons/react/24/solid'
import { DiloBrandLockup } from '@/components/dilo-brand-lockup'
import { cn } from '@/lib/utils'
import { DILO_THEME_CHANGE_EVENT } from '@/lib/theme-event'

const THEME_STORAGE_KEY = 'theme'

function getThemeSnapshot() {
  if (typeof window === 'undefined') return 'light'
  const s = localStorage.getItem(THEME_STORAGE_KEY)
  if (s === 'dark' || s === 'light') return s
  return 'light'
}

function subscribeTheme(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => cb()
  media.addEventListener('change', handler)
  window.addEventListener('storage', handler)
  window.addEventListener(DILO_THEME_CHANGE_EVENT, handler)
  return () => {
    media.removeEventListener('change', handler)
    window.removeEventListener('storage', handler)
    window.removeEventListener(DILO_THEME_CHANGE_EVENT, handler)
  }
}

function flowIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/dashboard\/flows\/([^/]+)/)
  if (!m || m[1] === 'new') return null
  return m[1]
}

function breadcrumbLabel(pathname: string): string {
  if (pathname === '/dashboard') return 'Mis flows'
  if (pathname.startsWith('/dashboard/outreach')) return 'Outreach'
  if (pathname.startsWith('/dashboard/account')) return 'Mi cuenta'
  if (pathname.startsWith('/dashboard/flows/new')) return 'Nuevo flow'
  if (pathname.match(/^\/dashboard\/flows\/[^/]+$/)) return 'Editor'
  if (pathname.startsWith('/dashboard/settings/plan')) return 'Plan & Uso'
  if (pathname.startsWith('/dashboard/settings/integrations')) return 'Integraciones'
  if (pathname.startsWith('/dashboard/settings/team')) return 'Equipo'
  if (pathname.startsWith('/dashboard/settings')) return 'Configuración'
  return 'Dashboard'
}

const headerMenuTrigger =
  'p-2 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F8F9FB] dark:hover:bg-[#252936] transition-colors'

const headerMenuPanel =
  'absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-visible rounded-xl border border-[#E5E7EB] bg-white px-0 pt-2 pb-2 font-sans text-sm antialiased shadow-lg dark:border-[#2A2F3F] dark:bg-[#1A1D29]'

const headerMenuItem =
  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium rounded-md transition-colors text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F8F9FB] dark:hover:bg-[#252936] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB]'

const headerMenuDivider = 'my-2 border-t border-[#E5E7EB] dark:border-[#2A2F3F]'

/** Menú ⋮ del header (mismo patrón que Mordecai `DashboardShell`): cuenta + cerrar sesión. */
function DashboardHeaderUserMenu() {
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const closeMenu = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeMenu])

  const handleSignOut = async () => {
    closeMenu()
    await signOut({ redirectUrl: '/sign-in' })
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={headerMenuTrigger}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Cuenta y sesión"
        aria-label="Menú de cuenta"
      >
        <EllipsisVerticalIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={closeMenu} />
          <div
            className={headerMenuPanel}
            role="menu"
            aria-label="Cuenta y sesión"
          >
            <Link
              href="/dashboard/account"
              role="menuitem"
              onClick={closeMenu}
              className={headerMenuItem}
            >
              <UserCircleIcon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
              Mi cuenta
            </Link>
            <div className={headerMenuDivider} />
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              className={`${headerMenuItem} w-full rounded-b-xl rounded-t-none`}
            >
              <ArrowRightStartOnRectangleIcon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

type ClerkUser = ReturnType<typeof useUser>['user']

function userInitials(user: ClerkUser): string {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  if (full) {
    return full
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  return email.slice(0, 2).toUpperCase()
}

function SidebarUserCard({
  user,
  plan,
  meLoaded,
  collapsed,
  onNavigate,
}: {
  user: ClerkUser
  plan: string
  meLoaded: boolean
  collapsed: boolean
  onNavigate: () => void
}) {
  const initials = userInitials(user)
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    '—'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const resolvedPlan = isPlan(plan) ? plan : 'free'
  const planLabel = meLoaded ? PLAN_LABELS[resolvedPlan] : ''
  const planColor = meLoaded ? PLAN_COLORS[resolvedPlan] : ''

  return (
    <div className="shrink-0 border-t border-[#E5E7EB] dark:border-[#2A2F3F] p-3">
      <Link
        href="/dashboard/account"
        onClick={onNavigate}
        className={`
          flex items-center gap-3 rounded-xl p-2 transition-colors
          hover:bg-[#F3F4F6] dark:hover:bg-[#252936]
          ${collapsed ? 'justify-center' : ''}
        `}
        title={collapsed ? displayName : undefined}
      >
        {/* Initials avatar */}
        <div className="relative shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C3AED]/12 text-[#7C3AED] dark:bg-[#7C3AED]/20 dark:text-[#C4B5FD] text-xs font-bold select-none">
            {initials}
          </div>
          {/* Plan indicator dot — only when collapsed */}
          {collapsed && meLoaded && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#F8F9FB] dark:border-[#1A1D29] ${
                resolvedPlan === 'agency'
                  ? 'bg-[#06B6D4]'
                  : resolvedPlan === 'pro'
                  ? 'bg-[#7C3AED]'
                  : 'bg-[#D1D5DB]'
              }`}
            />
          )}
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate text-xs font-medium text-[#111827] dark:text-[#F9FAFB]">
                {displayName}
              </span>
              {meLoaded && (
                <span className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${planColor}`}>
                  {planLabel}
                </span>
              )}
            </div>
            <span className="block truncate text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">
              {email}
            </span>
          </div>
        )}
      </Link>
    </div>
  )
}

export default function DiloDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/dashboard'
  const searchParams = useSearchParams()
  const tool = searchParams.get('tool')
  const { user } = useUser()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => 'light')
  const isDark = theme === 'dark'

  const [plan, setPlan] = useState<string>('')
  const [orgRole, setOrgRole] = useState<string | null>(null)
  const [meLoaded, setMeLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/settings/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setPlan(res.data.plan ?? 'free')
          setOrgRole(typeof res.data.role === 'string' ? res.data.role : null)
        }
      })
      .catch(() => setPlan('free'))
      .finally(() => setMeLoaded(true))
  }, [])

  const flowId = flowIdFromPath(pathname)
  /** Solo el editor raíz necesita `overflow-hidden`; rutas como results/connectors deben hacer scroll en `main`. */
  const isFlowEditorWorkspace = Boolean(flowId && pathname === `/dashboard/flows/${flowId}`)
  const panelOpen = Boolean(flowId && tool && ['ia', 'elements'].includes(tool))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    if (panelOpen) setIsSidebarCollapsed(true)
  }, [panelOpen])

  const handleToggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark'
    localStorage.setItem(THEME_STORAGE_KEY, next)
    window.dispatchEvent(new Event(DILO_THEME_CHANGE_EVENT))
  }, [isDark])

  const misFlowsActive = pathname === '/dashboard'
  const outreachActive = pathname.startsWith('/dashboard/outreach')
  const newFlowActive = pathname.startsWith('/dashboard/flows/new')
  const editorTool = flowId ? tool : null
  const createIaHref = flowId ? `/dashboard/flows/${flowId}?tool=ia` : '/dashboard/flows/new'
  const createIaActive = newFlowActive || editorTool === 'ia'

  const accountNavActive = pathname.startsWith('/dashboard/account')
  const settingsPlanActive = pathname.startsWith('/dashboard/settings/plan')
  const settingsIntegrationsActive = pathname.startsWith('/dashboard/settings/integrations')
  const settingsTeamActive = pathname.startsWith('/dashboard/settings/team')
  const canManageIntegrationsNav = orgRole === 'owner' || orgRole === 'admin'

  const navBtn = (active: boolean, collapsed: boolean, extra?: string) =>
    cn(
      'w-full flex items-center rounded-xl text-sm font-medium transition-colors duration-200',
      collapsed ? 'md:justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
      active
        ? 'bg-[#9C77F5]/8 text-[#6B4DD4] ring-1 ring-inset ring-[#9C77F5]/18 dark:bg-[#9C77F5]/12 dark:text-[#D4C4FC] dark:ring-[#9C77F5]/22'
        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
      extra,
    )

  const toolHref = (t: string) => (flowId ? `/dashboard/flows/${flowId}?tool=${t}` : null)

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F1117] font-sans">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${
          isSidebarCollapsed ? 'md:w-20' : 'md:w-64'
        } fixed md:relative z-50 md:z-auto w-64 bg-[#F8F9FB] dark:bg-[#1A1D29] border-r border-[#E5E7EB] dark:border-[#2A2F3F] flex flex-col transition-all duration-300 h-full`}
      >
        <div className="h-16 border-b border-[#E5E7EB] dark:border-[#2A2F3F] flex items-center justify-center w-full relative px-3">
          <div className="h-full w-full flex flex-col items-center justify-center min-h-0 py-2">
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                'flex min-w-0 items-center text-left',
                isSidebarCollapsed ? 'justify-center' : 'flex-col gap-0.5',
              )}
              aria-label="Dilo — Mis flows"
            >
              {isSidebarCollapsed ? (
                <DiloBrandLockup showWordmark={false} imageHeight={36} className="justify-center" />
              ) : (
                <>
                  <DiloBrandLockup
                    imageHeight={28}
                    gapClassName="gap-[10px]"
                    wordmarkClassName="text-lg font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]"
                    className="min-w-0 justify-center"
                  />
                  <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] text-center leading-tight">
                    Prompts en conversaciones con IA
                  </span>
                </>
              )}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden absolute right-4 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB]"
            aria-label="Cerrar menú"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex absolute -right-2 top-1/2 z-10 h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#94A3B8] shadow-sm transition-colors hover:border-[#CBD5E1] hover:text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#64748B] dark:hover:border-[#3d4456] dark:hover:text-[#94A3B8]"
            aria-label={isSidebarCollapsed ? 'Expandir barra' : 'Contraer barra'}
          >
            {isSidebarCollapsed ? (
              <ChevronRightIcon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
            ) : (
              <ChevronLeftIcon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide flex flex-col min-h-0">
          <p
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-2 px-1',
              isSidebarCollapsed && 'sr-only',
            )}
          >
            Biblioteca
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navBtn(misFlowsActive, isSidebarCollapsed)}
              >
                <FolderOpenIcon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span className="flex-1 text-left">Mis flows</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/outreach"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navBtn(outreachActive, isSidebarCollapsed)}
              >
                <EnvelopeOpenIcon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span className="flex-1 text-left">Outreach</span>}
              </Link>
            </li>
          </ul>

          <div
            className={cn(
              'my-3 h-px bg-[#E5E7EB] dark:bg-[#2A2F3F]',
              isSidebarCollapsed && 'mx-1',
            )}
            role="separator"
          />

          <p
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider text-[#9C77F5] mb-2 px-1',
              isSidebarCollapsed && 'sr-only',
            )}
          >
            Editor de flow
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href={createIaHref}
                onClick={() => setIsMobileMenuOpen(false)}
                className={navBtn(createIaActive, isSidebarCollapsed)}
              >
                {createIaActive ? (
                  <SparklesIconSolid className="w-5 h-5 shrink-0" />
                ) : (
                  <SparklesIcon className="w-5 h-5 shrink-0" />
                )}
                {!isSidebarCollapsed && <span className="flex-1 text-left">Create with IA</span>}
              </Link>
            </li>
            <li>
              {toolHref('elements') ? (
                <Link
                  href={toolHref('elements')!}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={navBtn(editorTool === 'elements', isSidebarCollapsed)}
                >
                  <Squares2X2Icon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="flex-1 text-left">Forms Elements</span>}
                </Link>
              ) : (
                <span
                  className={navBtn(false, isSidebarCollapsed, 'opacity-45 cursor-not-allowed pointer-events-none')}
                  title="Abre un flow desde Mis flows"
                >
                  <Squares2X2Icon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="flex-1 text-left">Forms Elements</span>}
                </span>
              )}
            </li>
          </ul>

          <div className="flex-1 min-h-4" />

          <div
            className={cn(
              'my-3 h-px bg-[#E5E7EB] dark:bg-[#2A2F3F]',
              isSidebarCollapsed && 'mx-1',
            )}
            role="separator"
          />

          <p
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-2 px-1',
              isSidebarCollapsed && 'sr-only',
            )}
          >
            Configuración
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/dashboard/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navBtn(accountNavActive, isSidebarCollapsed)}
              >
                <UserCircleIcon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span className="flex-1 text-left">Mi cuenta</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/settings/plan"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navBtn(settingsPlanActive, isSidebarCollapsed)}
              >
                <CreditCardIcon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span className="flex-1 text-left">Plan & Uso</span>}
              </Link>
            </li>
            {meLoaded && canManageIntegrationsNav ? (
              <li>
                <Link
                  href="/dashboard/settings/integrations"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={navBtn(settingsIntegrationsActive, isSidebarCollapsed)}
                >
                  <PuzzlePieceIcon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="flex-1 text-left">Integraciones</span>}
                </Link>
              </li>
            ) : null}
            <li>
              <Link
                href="/dashboard/settings/team"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navBtn(settingsTeamActive, isSidebarCollapsed)}
              >
                <UsersIcon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span className="flex-1 text-left">Equipo</span>}
              </Link>
            </li>
          </ul>

          <div className="min-h-2" />
        </nav>

        <SidebarUserCard
          user={user}
          plan={plan}
          meLoaded={meLoaded}
          collapsed={isSidebarCollapsed}
          onNavigate={() => setIsMobileMenuOpen(false)}
        />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white dark:bg-[#1A1D29] border-b border-[#E5E7EB] dark:border-[#2A2F3F] px-4 md:px-6 flex items-center shrink-0">
          <div className="flex items-center justify-between w-full gap-4">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F8F9FB] dark:hover:bg-[#252936] transition-colors"
              aria-label="Abrir menú"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-xs md:text-sm text-[#6B7280] dark:text-[#9CA3AF] flex-1 min-w-0">
              <span className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB] truncate">Dilo</span>
              <span>/</span>
              <span className="truncate">{breadcrumbLabel(pathname)}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleToggleTheme}
                className="p-2 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F8F9FB] dark:hover:bg-[#252936] transition-colors"
                aria-label="Tema"
              >
                {isDark ? <SunIcon className="w-5 h-5" strokeWidth={1.5} /> : <MoonIcon className="w-5 h-5" strokeWidth={1.5} />}
              </button>
              <DashboardHeaderUserMenu />
            </div>
          </div>
        </header>

        <main
          className={cn(
            'flex-1 scrollbar-hide bg-white dark:bg-[#0F1117]',
            isFlowEditorWorkspace
              ? 'flex min-h-0 flex-col overflow-hidden'
              : 'overflow-y-auto p-4 md:p-6',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
