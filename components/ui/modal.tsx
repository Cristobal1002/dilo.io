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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative w-full ${MAX_WIDTH[size]} rounded-2xl bg-white dark:bg-[#1A1D29] shadow-xl border border-[#E5E7EB] dark:border-[#2A2F3F]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dilo-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E5E7EB] dark:border-[#2A2F3F]">
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
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer ? (
          <div className="flex items-center justify-end gap-3 px-6 pb-5 pt-1">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
