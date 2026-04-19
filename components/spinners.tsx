'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** `inverse`: para fondos morado / botón primario (trazo claro). */
export type SpinnerVariant = 'default' | 'inverse'

const SIZE_CLASS: Record<SpinnerSize, string> = {
  xs: 'h-3.5 w-3.5 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-10 w-10 border-[3px]',
  xl: 'h-14 w-14 border-[3px]',
}

const VARIANT_CLASS: Record<SpinnerVariant, string> = {
  default:
    'border-[#E5E7EB] border-t-[#9C77F5] dark:border-[#2A2F3F] dark:border-t-[#9C77F5]',
  inverse: 'border-white/25 border-t-white',
}

export type SpinnerProps = {
  size?: SpinnerSize
  variant?: SpinnerVariant
  className?: string
  /** Por defecto `status`; usa `presentation` si va dentro de un botón con texto. */
  role?: 'status' | 'presentation'
  'aria-label'?: string
}

/**
 * Spinner base (aro). Usar tamaños `xs`–`xl` para densidad consistente en toda la app.
 */
export function Spinner({
  size = 'md',
  variant = 'default',
  className,
  role = 'status',
  'aria-label': ariaLabel,
}: SpinnerProps) {
  const label = role === 'presentation' ? undefined : ariaLabel ?? 'Cargando'
  return (
    <span
      role={role}
      aria-label={label}
      aria-hidden={role === 'presentation' ? true : undefined}
      className={cn(
        'inline-block animate-spin rounded-full border-solid',
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      )}
    />
  )
}

export type ButtonSpinnerProps = Omit<SpinnerProps, 'size'> & {
  size?: SpinnerSize
}

/**
 * Spinner compacto para botones (por defecto `sm` + `shrink-0`).
 * En botones morados pasar `variant="inverse"`.
 */
export function ButtonSpinner({ size = 'sm', className, ...rest }: ButtonSpinnerProps) {
  return (
    <Spinner
      size={size}
      role="presentation"
      className={cn('shrink-0 align-middle', className)}
      {...rest}
    />
  )
}

export type SavingSpinnerProps = {
  /** Texto junto al aro (p. ej. junto a textarea o bajo el campo). */
  label?: string
  className?: string
  /** Tamaño del aro; por defecto `xs` para líneas de texto. */
  size?: SpinnerSize
}

/**
 * Indicador de guardado alineado en línea: aro + texto. Ideal bajo inputs/textarea o en footers de formulario.
 */
export function SavingSpinner({ label = 'Guardando…', className, size = 'xs' }: SavingSpinnerProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Spinner size={size} role="presentation" />
      <span>{label}</span>
    </span>
  )
}

export type GlobalSpinnerProps = {
  open: boolean
  /** Texto bajo el aro grande. */
  label?: string
  lockBody?: boolean
  className?: string
}

/**
 * Overlay de pantalla completa, portal a `document.body`. z-index alto para cubrir modales (`z-[110]`).
 */
export function GlobalSpinner({ open, label, lockBody = true, className }: GlobalSpinnerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || !lockBody) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, lockBody])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-110 flex items-center justify-center bg-black/40 p-6 backdrop-blur-[1px]',
        className,
      )}
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
      aria-label={label ?? 'Cargando'}
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white px-10 py-8 shadow-xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
        <Spinner size="lg" />
        {label ? (
          <p className="max-w-xs text-center text-sm font-medium text-[#4B5563] dark:text-[#9CA3AF]">{label}</p>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
