import Link from 'next/link'
import type { ReactNode } from 'react'

import { DiloBrandLockup } from '@/components/dilo-brand-lockup'
import { cn } from '@/lib/utils'

type LegalDocShellProps = {
  children: ReactNode
  crossLink: { href: string; label: string }
}

export function LegalDocShell({ children, crossLink }: LegalDocShellProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#111827] dark:bg-[#0F1117] dark:text-[#F3F4F6]">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute -left-[20%] top-0 h-[420px] w-[70%] rounded-full opacity-40 blur-[100px]"
          style={{ background: 'radial-gradient(ellipse, rgba(156,119,245,0.14) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -right-[15%] bottom-0 h-[380px] w-[55%] rounded-full opacity-35 blur-[90px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,176,0.1) 0%, transparent 70%)' }}
        />
      </div>

      <header className="sticky top-0 z-10 border-b border-[#E5E7EB] bg-white/85 backdrop-blur-md dark:border-[#2A2F3F] dark:bg-[#1A1D29]/90">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 rounded-xl py-1 pr-2 outline-offset-4 transition-opacity hover:opacity-90"
          >
            <DiloBrandLockup
              imageHeight={32}
              gapClassName="gap-[10px]"
              wordmarkClassName="text-lg font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]"
            />
          </Link>
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-[#F9FAFB]"
          >
            ← Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 md:py-14">{children}</main>

      <footer className="border-t border-[#E5E7EB] py-10 text-center text-sm text-[#9CA3AF] dark:border-[#2A2F3F] dark:text-[#6B7280]">
        <p className="mx-auto mb-4 max-w-lg px-4 text-xs leading-relaxed text-[#9CA3AF] dark:text-[#6B7280]">
          Dilo es un producto de Mordecai Technologies LLC.
        </p>
        <div>
          <span>© {new Date().getFullYear()} Mordecai Technologies LLC</span>
          <span className="mx-2 text-[#D1D5DB] dark:text-[#4B5563]">·</span>
          <Link
            href={crossLink.href}
            className="font-medium text-[#6B7280] underline-offset-2 transition-colors hover:text-[#111827] hover:underline dark:text-[#9CA3AF] dark:hover:text-[#E5E7EB]"
          >
            {crossLink.label}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export function LegalDocCard({
  title,
  lastUpdated,
  children,
}: {
  title: string
  lastUpdated: string
  children: ReactNode
}) {
  return (
    <article
      className={cn(
        'rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_22px_64px_-24px_rgba(15,23,42,0.12)] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:shadow-[0_22px_64px_-24px_rgba(0,0,0,0.45)] md:p-12',
        '[&_a]:font-medium [&_a]:text-[#6B4DD4] [&_a]:underline-offset-2 hover:[&_a]:underline dark:[&_a]:text-[#B8A4FC]',
      )}
    >
      <h1 className="text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">{title}</h1>
      <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">Última actualización: {lastUpdated}</p>
      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-[#374151] dark:text-[#D1D5DB]">
        {children}
      </div>
    </article>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function LegalSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-base font-medium text-[#111827] dark:text-[#E5E7EB]">{title}</h3>
      {children}
    </div>
  )
}
