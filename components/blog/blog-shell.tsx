import Link from 'next/link'
import { DiloBrandLockup } from '@/components/dilo-brand-lockup'
import { cn } from '@/lib/utils'

export function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'blog-shell relative min-h-screen',
        'bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(124,58,237,0.14),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_0%,rgba(6,182,212,0.08),transparent_45%),var(--background)]',
        'dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(124,58,237,0.22),transparent_50%),radial-gradient(ellipse_60%_40%_at_100%_20%,rgba(6,182,212,0.06),transparent_40%),var(--background)]',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <header className="sticky top-0 z-30 border-b border-[rgba(124,58,237,0.1)] bg-[rgba(248,249,251,0.85)] backdrop-blur-md dark:border-[rgba(124,58,237,0.15)] dark:bg-[rgba(15,17,23,0.88)]">
        <div className="mx-auto flex h-13 max-w-5xl items-center justify-between gap-4 px-4 sm:h-14 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-lg outline-offset-2 transition-opacity hover:opacity-90"
          >
            <DiloBrandLockup imageHeight={28} gapClassName="gap-2" wordmarkClassName="text-lg text-foreground" />
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
            <Link
              href="/blog"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-dilo-600 dark:text-[#C4B5FD]"
            >
              Blog
            </Link>
            <Link
              href="/"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
            >
              Producto
            </Link>
            <Link
              href="/sign-up"
              className="ml-1 inline-flex items-center rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 px-3 py-2 text-sm font-bold text-white shadow-md shadow-dilo-500/20 transition hover:opacity-95 sm:px-4"
            >
              Empezar gratis
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 mt-16 border-t border-border-subtle py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left sm:px-6">
          <p className="text-muted-foreground/80">© {new Date().getFullYear()} Dilo</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-dilo-600 dark:hover:text-[#C4B5FD]">
              Privacidad
            </Link>
            <Link href="/terms" className="transition-colors hover:text-dilo-600 dark:hover:text-[#C4B5FD]">
              Términos
            </Link>
            <Link href="/" className="transition-colors hover:text-dilo-600 dark:hover:text-[#C4B5FD]">
              Inicio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
