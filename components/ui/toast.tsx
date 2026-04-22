'use client'

import { createContext, useCallback, useContext, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface DiloToast {
  id: string
  message: string
  type: ToastType
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500 text-white',
  error:   'bg-red-500 text-white',
  info:    'bg-[#7b5bd4] text-white',
}

function ToastItem({
  t,
  onDismiss,
}: {
  t: DiloToast
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium pointer-events-auto max-w-sm min-w-[220px] ${STYLES[t.type]}`}
      role="alert"
    >
      <span className="text-base leading-none shrink-0 font-bold">{ICONS[t.type]}</span>
      <span className="flex-1 leading-snug">{t.message}</span>
      <button
        onClick={() => onDismiss(t.id)}
        className="ml-1 opacity-70 hover:opacity-100 transition-opacity text-lg leading-none shrink-0"
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<DiloToast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString(36).slice(2, 10)
      setToasts((prev) => [...prev.slice(-2), { id, message, type }])
      setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notificaciones"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * Hook para lanzar toasts desde cualquier componente hijo de ToastProvider.
 * Uso: const toast = useToast()  →  toast('Mensaje', 'success')
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx.toast
}
