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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Blog</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">Aprende con Dilo</h1>
        <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Artículos cortos, directos y escritos para ser citados por Google y por motores de IA.
        </p>
      </div>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 text-sm text-[#6B7280] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#9CA3AF]">
            Aún no hay posts publicados.
          </div>
        ) : null}

        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="block rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 transition-colors hover:bg-[#FAFBFF] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:hover:bg-[#20243a]"
          >
            <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">
              {p.frontmatter.date.toLocaleDateString('es', { dateStyle: 'long' })}
            </p>
            <p className="mt-1 text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{p.frontmatter.title}</p>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">{p.frontmatter.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

