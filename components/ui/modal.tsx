'use client'

import { useEffect } from 'react'

interface DiloModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const MAX_WIDTH = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

/**
 * Modal reutilizable con la identidad visual de Dilo.
 * Se cierra con Escape o clic en el backdrop.
 */
export function DiloModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: DiloModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto overscroll-y-contain px-4 py-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] sm:justify-center sm:py-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel: altura acotada + cuerpo con scroll para móvil */}
      <div
        className={`relative my-auto flex w-full ${MAX_WIDTH[size]} max-h-[min(90dvh,42rem)] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dilo-modal-title"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-6 pb-4 pt-5 dark:border-[#2A2F3F]">
          <h2
            id="dilo-modal-title"
            className="text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#252936] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB] transition-colors"
            aria-label="Cerrar"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5">{children}</div>

        {/* Footer */}
        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#E5E7EB] bg-white px-6 py-4 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
