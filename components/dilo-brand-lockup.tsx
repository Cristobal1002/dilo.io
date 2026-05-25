'use client'

import type { CSSProperties } from 'react'
import { useSyncExternalStore } from 'react'

import { DILO_THEME_CHANGE_EVENT } from '@/lib/theme-event'
import { cn } from '@/lib/utils'

/** Lockup completo (icono + wordmark) vectorizado. */
export const DILO_LOGO_LIGHT_SRC = '/logo-dilo-fondo-claro.svg'
export const DILO_LOGO_DARK_SRC = '/logo-dilo-fondo-oscuro.svg'

/** Solo burbuja (recorte del lockup) para sidebar colapsado. */
const MARK_VIEWBOX_WIDTH = 14.5
const LOCKUP_VIEWBOX_WIDTH = 32.4
const LOCKUP_VIEWBOX_HEIGHT = 11.74
const LOCKUP_ASPECT = LOCKUP_VIEWBOX_WIDTH / LOCKUP_VIEWBOX_HEIGHT
const MARK_ASPECT = MARK_VIEWBOX_WIDTH / LOCKUP_VIEWBOX_HEIGHT

const THEME_STORAGE_KEY = 'theme'

function getThemeSnapshot() {
  if (typeof window === 'undefined') return 'light'
  const s = localStorage.getItem(THEME_STORAGE_KEY)
  if (s === 'dark' || s === 'light') return s
  return 'light'
}

function subscribeTheme(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => cb()
  window.addEventListener('storage', handler)
  window.addEventListener(DILO_THEME_CHANGE_EVENT, handler)
  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener(DILO_THEME_CHANGE_EVENT, handler)
  }
}

type DiloBrandLockupProps = {
  /** El SVG ya incluye “dilo”; por defecto no duplicamos texto. */
  showWordmark?: boolean
  /** `mark` = solo icono (sidebar colapsado). `full` = lockup horizontal. */
  variant?: 'full' | 'mark'
  /** Footer u otras zonas con fondo oscuro fijo. */
  onDarkBackground?: boolean
  /** Si se pasa, elige el SVG sin leer `localStorage` (p. ej. tema de la landing). */
  logoForDarkBackground?: boolean
  imageHeight: number
  gapClassName?: string
  className?: string
  wordmarkClassName?: string
  wordmarkStyle?: CSSProperties
}

export function DiloBrandLockup({
  showWordmark = false,
  variant = 'full',
  onDarkBackground = false,
  logoForDarkBackground,
  imageHeight,
  gapClassName = 'gap-2.5',
  className,
  wordmarkClassName,
  wordmarkStyle,
}: DiloBrandLockupProps) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => 'light')
  const useDarkLogo =
    logoForDarkBackground !== undefined
      ? logoForDarkBackground
      : onDarkBackground || theme === 'dark'
  const src = useDarkLogo ? DILO_LOGO_DARK_SRC : DILO_LOGO_LIGHT_SRC

  const fullWidth = Math.round(imageHeight * LOCKUP_ASPECT)
  const markWidth = Math.round(imageHeight * MARK_ASPECT)

  const img =
    variant === 'mark' ? (
      <span
        className="inline-block shrink-0 overflow-hidden"
        style={{ width: markWidth, height: imageHeight }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={fullWidth}
          height={imageHeight}
          className="block max-w-none"
          style={{ height: imageHeight, width: fullWidth }}
        />
      </span>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Dilo"
        width={fullWidth}
        height={imageHeight}
        className="block w-auto shrink-0"
        style={{ height: imageHeight, width: fullWidth }}
      />
    )

  return (
    <div className={cn('flex items-center', gapClassName, className)}>
      {img}
      {showWordmark ? (
        <span className={cn('font-bold tracking-tight', wordmarkClassName)} style={wordmarkStyle}>
          dilo
        </span>
      ) : null}
    </div>
  )
}
