'use client'

import { useCallback, useState } from 'react'
import { ResendIntegrationForm, type ResendIntegrationStatus } from './resend-integration-form'
import {
  BadgeAvailable,
  integrationCardShell,
  integrationLogoWrap,
  LogoResend,
} from './integration-logos'
import { cn } from '@/lib/utils'

type HeadState = {
  loadComplete: boolean
  loadError: boolean
  status: ResendIntegrationStatus | null
}

function ConnectionSummary({ head }: { head: HeadState }) {
  if (!head.loadComplete) {
    return (
      <span className="inline-flex rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#64748B] dark:bg-[#252936] dark:text-[#94A3B8]">
        Comprobando…
      </span>
    )
  }
  if (head.loadError) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 dark:bg-red-950/40 dark:text-red-200">
        Estado no disponible
      </span>
    )
  }
  const status = head.status
  if (!status || !status.connected) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        No conectada
      </span>
    )
  }
  if (status.corrupt) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
        Datos incompletos
      </span>
    )
  }
  if (status.sendReady) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
        Conectada · lista para enviar
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      Conectada · falta remitente
    </span>
  )
}

export function ResendIntegrationCard() {
  const [open, setOpen] = useState(false)
  const [head, setHead] = useState<HeadState>({
    loadComplete: false,
    loadError: false,
    status: null,
  })

  const onStatusChange = useCallback(
    (p: { status: ResendIntegrationStatus | null; loadComplete: boolean; loadError: boolean }) => {
      setHead({
        loadComplete: p.loadComplete,
        loadError: p.loadError,
        status: p.status,
      })
    },
    [],
  )

  return (
    <article className={integrationCardShell}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex gap-3">
          <div className={integrationLogoWrap}>
            <LogoResend />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Resend</h2>
              <BadgeAvailable />
              <ConnectionSummary head={head} />
            </div>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
              Correo transaccional: outreach en frío, alertas de leads, resúmenes y notificaciones del workspace.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] py-2.5 text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#CBD5E1] dark:hover:bg-[#252936]"
        >
          <span className="select-none">{open ? 'Ocultar configuración' : 'Mostrar configuración'}</span>
          <svg
            className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div hidden={!open}>
        <div className="mt-4 border-t border-[#E8EAEF] pt-4 dark:border-[#2A2F3F]">
          <ResendIntegrationForm embedded onStatusChange={onStatusChange} />
        </div>
      </div>
    </article>
  )
}
