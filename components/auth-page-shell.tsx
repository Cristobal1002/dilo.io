'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
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

function AuthThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => 'light')
  const isDark = theme === 'dark'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => {
    const next = isDark ? 'light' : 'dark'
    localStorage.setItem(THEME_STORAGE_KEY, next)
    window.dispatchEvent(new Event(DILO_THEME_CHANGE_EVENT))
  }, [isDark])

  if (!mounted) {
    return <div className="h-9 w-9 shrink-0" aria-hidden />
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg border border-[#E5E7EB] bg-white p-2 text-[#6B7280] shadow-sm transition-colors hover:bg-[#F3F4F6] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#9CA3AF] dark:hover:bg-[#252936]"
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      {isDark ? <SunIcon className="h-4 w-4" strokeWidth={1.5} /> : <MoonIcon className="h-4 w-4" strokeWidth={1.5} />}
    </button>
  )
}

export type AuthPageShellProps = {
  /** Texto bajo la marca (una línea; el título del flujo lo pone Clerk en español). */
  tagline?: string
  children: React.ReactNode
}

/**
 * Marco común para `/sign-in` y `/sign-up`: fondo suave, marca Dilo y toggle de tema.
 * El cambio entrar / registrarse queda en la tarjeta de Clerk (`.cl-footerAction`).
 */
export function AuthPageShell({
  tagline = 'Flows conversacionales con IA.',
  children,
}: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-[30%] h-[min(380px,52vh)] w-[min(480px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-dilo-500/14 blur-3xl dark:bg-dilo-500/10" />
        <div className="absolute bottom-[14%] right-[6%] h-52 w-64 rounded-full bg-mint-500/12 blur-3xl dark:bg-mint-500/8" />
        <div className="absolute top-[18%] left-[4%] h-44 w-52 rounded-full bg-dilo-500/10 blur-3xl dark:bg-dilo-500/7" />
      </div>

      <header className="relative z-10 flex shrink-0 justify-end px-4 py-4 sm:px-6">
        <AuthThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pb-16 pt-2 sm:px-6 sm:pt-0">
        <div className="flex w-full max-w-[400px] flex-1 flex-col justify-center sm:max-w-md">
          <div className="mb-8 text-center">
            <p className="select-none text-[1.75rem] font-black leading-none tracking-tight">
              <span className="bg-linear-to-r from-[#9C77F5] via-[#8B5CF6] to-[#00d4b0] bg-clip-text text-transparent">
                DILO
              </span>
            </p>
            <div
              className="mx-auto mt-3 h-1 w-10 rounded-full bg-linear-to-r from-[#9C77F5] to-[#00d4b0]"
              aria-hidden
            />
            <p className="mx-auto mt-5 max-w-[280px] text-sm leading-snug text-[#6B7280] dark:text-[#9CA3AF]">
              {tagline}
            </p>
          </div>

          <div className="auth-clerk-root w-full [&_.cl-card]:overflow-hidden [&_.cl-card]:rounded-2xl [&_.cl-footer]:rounded-b-2xl [&_.cl-footerAction]:border-t [&_.cl-footerAction]:border-[#E5E7EB] [&_.cl-footerAction]:bg-[#FAFAFA] [&_.cl-footerAction]:px-4 [&_.cl-footerAction]:py-3.5 dark:[&_.cl-footerAction]:border-[#2A2F3F] dark:[&_.cl-footerAction]:bg-[#14151c]">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
