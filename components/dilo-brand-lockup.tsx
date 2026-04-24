import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'

export const DILO_MARK_IMAGE_SRC = '/rsz_dilo.png'

const DILO_MARK_WIDTH = 346
const DILO_MARK_HEIGHT = 330

type DiloBrandLockupProps = {
  showWordmark?: boolean
  imageHeight: number
  gapClassName?: string
  className?: string
  wordmarkClassName?: string
  wordmarkStyle?: CSSProperties
}

export function DiloBrandLockup({
  showWordmark = true,
  imageHeight,
  gapClassName = 'gap-2.5',
  className,
  wordmarkClassName,
  wordmarkStyle,
}: DiloBrandLockupProps) {
  return (
    <div className={cn('flex items-center', gapClassName, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset in public */}
      <img
        src={DILO_MARK_IMAGE_SRC}
        alt=""
        width={DILO_MARK_WIDTH}
        height={DILO_MARK_HEIGHT}
        aria-hidden
        className="block w-auto shrink-0"
        style={{ height: imageHeight }}
      />
      {showWordmark ? (
        <span className={cn('font-bold tracking-tight', wordmarkClassName)} style={wordmarkStyle}>
          dilo
        </span>
      ) : null}
    </div>
  )
}
