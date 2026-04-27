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
    <div className="not-prose my-10 flex w-full justify-center sm:justify-start">
      <Link
        href={href}
        className={cn(
          'dilo-mdx-cta inline-flex min-h-11 items-center justify-center rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-dilo-500/30 ring-1 ring-white/15 transition hover:opacity-[0.97] hover:shadow-xl hover:shadow-dilo-500/35 active:scale-[0.99]',
          className,
        )}
      >
        {children}
      </Link>
    </div>
  )
}
