'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderOpenIcon,
  MoonIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  Squares2X2Icon,
  SunIcon,
  SwatchIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { SparklesIcon as SparklesIconSolid } from '@heroicons/react/24/solid'

const THEME_STORAGE_KEY = 'theme'
const THEME_EVENT = 'mordecai-theme-change'

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
  window.addEventListener(THEME_EVENT, handler)
  return () => {
    media.removeEventListener('change', handler)
    window.removeEventListener('storage', handler)
    window.removeEventListener(THEME_EVENT, handler)
  }
}

function flowIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/dashboard\/flows\/([^/]+)$/)
  if (!m || m[1] === 'new') return null
  return m[1]
}

function breadcrumbLabel(pathname: string): string {
  if (pathname === '/dashboard') return 'Mis flows'
  if (pathname.startsWith('/dashboard/flows/new')) return 'Nuevo flow'
  if (pathname.match(/^\/dashboard\/flows\/[^/]+$/)) return 'Editor'
  return 'Dashboard'
}

function cn(...a: (string | false | undefined)[]) {
  return a.filter(Boolean).join(' ')
}

export default function DiloDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/dashboard'
  const searchParams = useSearchParams()
  const tool = searchParams.get('tool')

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => 'light')
  const isDark = theme === 'dark'

  const flowId = flowIdFromPath(pathname)
  const panelOpen = Boolean(flowId && tool && ['ia', 'elements', 'design', 'integrations'].includes(tool))

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
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [isDark])

  const misFlowsActive = pathname === '/dashboard'
  const newFlowActive = pathname.startsWith('/dashboard/flows/new')
  const editorTool = flowId ? tool : null
  const createIaHref = flowId ? `/dashboard/flows/${flowId}?tool=ia` : '/dashboard/flows/new'
  const createIaActive = newFlowActive || editorTool === 'ia'

  const navBtn = (active: boolean, collapsed: boolean, extra?: string) =>
    cn(
      'w-full flex items-center rounded-lg text-sm font-medium transition-all',
      collapsed ? 'md:justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
      active
        ? 'bg-[#9C77F5]/10 dark:bg-[#9C77F5]/20 text-[#9C77F5] dark:text-[#9C77F5]'
        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F8F9FB] dark:hover:bg-[#252936]',
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
            {!isSidebarCollapsed ? (
              <>
                <span className="text-lg font-bold tracking-tight bg-linear-to-r from-[#9C77F5] to-[#00d4b0] bg-clip-text text-transparent">
                  Dilo
                </span>
                <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] text-center leading-tight mt-0.5">
                  Prompts en conversaciones con IA
                </span>
              </>
            ) : (
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#9C77F5] to-[#9C77F5]/60 flex items-center justify-center text-white font-bold text-lg">
                D
              </div>
            )}
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
            className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#00d4b0] items-center justify-center shadow-lg hover:bg-[#00d4b0]/90 transition-colors z-10"
            aria-label={isSidebarCollapsed ? 'Expandir barra' : 'Contraer barra'}
          >
            {isSidebarCollapsed ? (
              <ChevronRightIcon className="w-2.5 h-2.5 text-white" />
            ) : (
              <ChevronLeftIcon className="w-2.5 h-2.5 text-white" />
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
            <li>
              {toolHref('design') ? (
                <Link
                  href={toolHref('design')!}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={navBtn(editorTool === 'design', isSidebarCollapsed)}
                >
                  <SwatchIcon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="flex-1 text-left">Design options</span>}
                </Link>
              ) : (
                <span
                  className={navBtn(false, isSidebarCollapsed, 'opacity-45 cursor-not-allowed pointer-events-none')}
                  title="Abre un flow desde Mis flows"
                >
                  <SwatchIcon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="flex-1 text-left">Design options</span>}
                </span>
              )}
            </li>
            <li>
              {toolHref('integrations') ? (
                <Link
                  href={toolHref('integrations')!}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={navBtn(editorTool === 'integrations', isSidebarCollapsed)}
                >
                  <PuzzlePieceIcon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="flex-1 text-left">Integrations</span>}
                </Link>
              ) : (
                <span
                  className={navBtn(false, isSidebarCollapsed, 'opacity-45 cursor-not-allowed pointer-events-none')}
                  title="Abre un flow desde Mis flows"
                >
                  <PuzzlePieceIcon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="flex-1 text-left">Integrations</span>}
                </span>
              )}
            </li>
          </ul>

          <div className="flex-1 min-h-2" />

          <ul className="space-y-1 pt-2 border-t border-[#E5E7EB] dark:border-[#2A2F3F]">
            <li>
              <Link
                href="/discovery"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navBtn(pathname.startsWith('/discovery'), isSidebarCollapsed)}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span className="flex-1 text-left">Demo conversación</span>}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="relative p-4 border-t border-[#E5E7EB] dark:border-[#2A2F3F] shrink-0">
          {!isSidebarCollapsed && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Dilo</span>
                <span className="text-xs font-semibold text-[#9C77F5]">Beta</span>
              </div>
              <div className="w-full h-2 bg-[#E5E7EB] dark:bg-[#2A2F3F] rounded-full overflow-hidden">
                <div className="h-full bg-linear-to-r from-[#9C77F5] to-[#9C77F5]/80 rounded-full w-full" />
              </div>
            </div>
          )}
          <div className={`flex items-center ${isSidebarCollapsed ? 'md:justify-center' : 'gap-3'}`}>
            <UserButton />
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0 text-xs text-[#9CA3AF] dark:text-[#6B7280]">Cuenta</div>
            )}
          </div>
        </div>
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
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-2 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F8F9FB] dark:hover:bg-[#252936] transition-colors"
              aria-label="Tema"
            >
              {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main
          className={cn(
            'flex-1 scrollbar-hide bg-white dark:bg-[#0F1117]',
            flowId
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
