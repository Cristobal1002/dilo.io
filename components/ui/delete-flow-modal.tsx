'use client'

import { useState } from 'react'
import { DiloModal } from './modal'
import { ButtonSpinner } from '@/components/spinners'

interface DeleteFlowModalProps {
  isOpen: boolean
  onClose: () => void
  flowName: string
  /** Número de sesiones existentes en este flow (0 = sin datos). */
  sessionCount: number
  /** Llamado al confirmar. Debe resolver cuando el borrado termine (o lanzar en error). */
  onConfirm: () => Promise<void>
}

/**
 * Modal de confirmación de borrado de flow.
 *
 * - Sin datos: solo muestra advertencia y un botón rojo.
 * - Con datos: muestra el número de sesiones y obliga al usuario a escribir "delete me".
 */
export function DeleteFlowModal({
  isOpen,
  onClose,
  flowName,
  sessionCount,
  onConfirm,
}: DeleteFlowModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const hasData = sessionCount > 0
  const canDelete = !hasData || confirmText.trim() === 'delete me'

  const handleClose = () => {
    if (loading) return
    setConfirmText('')
    onClose()
  }

  const handleConfirm = async () => {
    if (!canDelete || loading) return
    setLoading(true)
    try {
      await onConfirm()
      setConfirmText('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DiloModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Eliminar flow"
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#252936] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canDelete || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <ButtonSpinner variant="inverse" /> : null}
            Eliminar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
          Vas a eliminar{' '}
          <span className="font-semibold text-foreground">"{flowName}"</span>.
          Esta acción no se puede deshacer.
        </p>

        {hasData ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              ⚠️ Este flow tiene datos capturados
            </p>
            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              {sessionCount === 1
                ? 'Hay 1 sesión con respuestas que se eliminará permanentemente.'
                : `Hay ${sessionCount} sesiones con respuestas que se eliminarán permanentemente.`}
            </p>
          </div>
        ) : null}

        {hasData ? (
          <div>
            <label
              htmlFor="delete-confirm-input"
              className="block text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1.5"
            >
              Escribe{' '}
              <span className="font-mono font-semibold text-foreground">delete me</span>{' '}
              para confirmar
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete me"
              disabled={loading}
              autoComplete="off"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canDelete) handleConfirm()
              }}
              className="w-full rounded-lg border border-[#E5E7EB] dark:border-[#2A2F3F] bg-white dark:bg-[#13151f] px-3 py-2 text-sm text-foreground placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#9c77f5] focus:ring-2 focus:ring-[#9c77f5]/20 transition-colors disabled:opacity-50"
            />
          </div>
        ) : null}
      </div>
    </DiloModal>
  )
}
