'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { dashboardPageClass } from '@/lib/dashboard-page-layout'
import { dashboardEyebrow, linkAccent } from '@/lib/dashboard-ui'
import { cn } from '@/lib/utils'

const METHODS = [
  {
    href: '/dashboard/settings/connections/embed',
    label: 'Widget embebido',
    description: 'Formulario en tu web o dashboard',
    available: true,
  },
  {
    href: '/dashboard/settings/connections/invite',
    label: 'Enlace de invitación',
    description: 'Próximamente',
    available: false,
  },
] as const

export default function ConnectionsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className={cn(dashboardPageClass, 'flex flex-col gap-6 lg:flex-row lg:gap-8')}>
      <aside className="shrink-0 lg:w-56">
        <p className={dashboardEyebrow}>Configuración</p>
        <h2 className="mt-1 text-lg font-bold text-foreground">Métodos de conexión</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Cómo tus usuarios acceden al formulario sin fricción.
        </p>
        <nav className="mt-4 space-y-1">
          {METHODS.map((m) =>
            m.available ? (
              <Link
                key={m.href}
                href={m.href}
                className={cn(
                  'block rounded-xl px-3 py-2.5 text-sm transition-colors',
                  pathname === m.href || pathname.startsWith(`${m.href}/`)
                    ? 'bg-[#9C77F5]/10 font-semibold text-[#6B4DD4] dark:bg-[#9C77F5]/15 dark:text-[#D4C4FC]'
                    : 'text-muted-foreground hover:bg-black/3 dark:hover:bg-white/4',
                )}
              >
                {m.label}
                <span className="mt-0.5 block text-[11px] font-normal opacity-80">{m.description}</span>
              </Link>
            ) : (
              <span
                key={m.href}
                className="block cursor-not-allowed rounded-xl px-3 py-2.5 text-sm text-[#9CA3AF] opacity-60"
              >
                {m.label}
                <span className="mt-0.5 block text-[11px]">{m.description}</span>
              </span>
            ),
          )}
        </nav>
        <Link href="/dashboard/clients" className={cn(linkAccent, 'mt-4 inline-block text-xs')}>
          Gestionar clientes →
        </Link>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
