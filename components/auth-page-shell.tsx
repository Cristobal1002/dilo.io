'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { DiloBrandLockup } from '@/components/dilo-brand-lockup'
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
      {/* Blobs decorativos — style inline para evitar dependencias de tokens Tailwind */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-[28%] h-[min(420px,55vh)] w-[min(560px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(156,119,245,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[10%] right-[4%] h-60 w-72 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,176,0.14) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-[14%] left-[3%] h-48 w-56 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(156,119,245,0.12) 0%, transparent 70%)' }}
        />
      </div>

      <header className="relative z-10 flex shrink-0 justify-end px-4 py-4 sm:px-6">
        <AuthThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pb-16 pt-2 sm:px-6 sm:pt-0">
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center">
          <div className="mb-8 text-center">
            <div
              className="relative mx-auto flex w-fit justify-center"
              style={{ filter: 'drop-shadow(0 10px 28px rgba(156,119,245,.22))' }}
            >
              <DiloBrandLockup
                imageHeight={38}
                className="justify-center"
                gapClassName="gap-[10px]"
                wordmarkClassName="text-[28px] font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]"
              />
            </div>
            <div
              className="mx-auto mt-3 h-1 w-10 rounded-full bg-linear-to-r from-[#9C77F5] to-[#00d4b0]"
              aria-hidden
            />
            <p className="mx-auto mt-5 max-w-[280px] text-sm leading-snug text-[#6B7280] dark:text-[#9CA3AF]">
              {tagline}
            </p>
          </div>

          {/*
            Clerk no expone un API estable para ocultar el footer de "Secured by Clerk".
            layout.footerPages: 'hidden' no funciona. La forma más robusta es CSS directo.
          */}
          <style>{`
            /* Ocultar "Secured by Clerk" y "Development mode" */
            .auth-clerk-root .cl-footerPages { display: none !important; }
            .auth-clerk-root [class*="cl-footerPage"] { display: none !important; }
            .auth-clerk-root [class*="cl-footer__page"] { display: none !important; }
            /* Eliminar bullet del divisor "o" */
            .auth-clerk-root .cl-dividerText,
            .auth-clerk-root [class*="cl-divider"] li,
            .auth-clerk-root [class*="cl-divider"] span {
              list-style: none !important;
            }
            .auth-clerk-root [class*="cl-divider"] li::marker { display: none !important; content: none !important; }
          `}</style>
          <div
            className="auth-clerk-root w-full rounded-2xl [&_.cl-card]:overflow-hidden [&_.cl-card]:rounded-2xl [&_.cl-footer]:rounded-b-2xl [&_.cl-footerAction]:border-t [&_.cl-footerAction]:border-[#E5E7EB] [&_.cl-footerAction]:bg-[#F4F4F6] [&_.cl-footerAction]:px-4 [&_.cl-footerAction]:py-3.5"
            style={{
              boxShadow: '-22px 22px 64px rgba(156,119,245,0.18), 22px 22px 64px rgba(0,212,176,0.13)',
            }}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
