import Link from 'next/link'
import { listBlogPosts } from '@/lib/blog'

export const metadata = {
  title: 'Blog — Dilo',
  description: 'Guías y ejemplos para crear flows conversacionales con IA.',
  alternates: { canonical: 'https://getdilo.io/blog' },
}

export default async function BlogIndexPage() {
  const posts = await listBlogPosts()

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-dilo-600 dark:text-[#C4B5FD]">Blog</p>
        <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
          Ideas para{' '}
          <span className="landing-grad-text-light">flows que convierten</span>
        </h1>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Artículos cortos sobre formularios conversacionales, captación de leads y producto. Pensados para leer en
          minutos — y para que buscadores y asistentes puedan citarlos con claridad.
        </p>
      </header>

      <div className="mx-auto mt-14 max-w-3xl space-y-4 sm:mt-16">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface/90 px-6 py-10 text-center shadow-sm backdrop-blur-sm dark:bg-surface/80">
            <p className="text-sm text-muted-foreground">Aún no hay posts publicados.</p>
            <p className="mt-2 text-xs text-muted-foreground/80">Cuando publiques un .mdx sin draft, aparecerá aquí.</p>
          </div>
        ) : null}

        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group relative block overflow-hidden rounded-2xl border border-[rgba(124,58,237,0.12)] bg-surface/95 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,58,237,0.28)] hover:shadow-lg hover:shadow-dilo-500/10 sm:p-6 dark:border-[rgba(124,58,237,0.18)] dark:bg-[#161a26]/90 dark:hover:border-[rgba(167,139,250,0.35)]"
          >
            <span
              className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-linear-to-b from-dilo-500 to-mint-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1 pl-0 sm:pl-2">
                <time
                  dateTime={p.frontmatter.date.toISOString()}
                  className="text-xs font-semibold uppercase tracking-wide text-dilo-600 dark:text-[#A78BFA]"
                >
                  {p.frontmatter.date.toLocaleDateString('es', { dateStyle: 'long' })}
                </time>
                <h2 className="mt-2 text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-dilo-600 dark:group-hover:text-[#C4B5FD] sm:text-xl">
                  {p.frontmatter.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{p.frontmatter.description}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-semibold text-dilo-600 transition-transform group-hover:translate-x-0.5 dark:text-[#C4B5FD] sm:mt-7 sm:self-auto">
                Leer
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                  <path
                    d="M5 12h14m0 0-6-6m6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
