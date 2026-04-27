'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Cta({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'not-prose inline-flex items-center justify-center rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-dilo-500/25 hover:opacity-95',
        className,
      )}
    >
      {children}
    </Link>
  )
}

