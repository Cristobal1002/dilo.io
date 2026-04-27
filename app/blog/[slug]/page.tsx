import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { getBlogPost, listBlogSlugs } from '@/lib/blog'
import { Cta } from '@/components/blog/mdx-cta'

export async function generateStaticParams() {
  const slugs = await listBlogSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) return {}

  const canonical = post.frontmatter.canonical ?? `https://getdilo.io/blog/${post.slug}`

  return {
    title: `${post.frontmatter.title} — Dilo`,
    description: post.frontmatter.description,
    alternates: { canonical },
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url: canonical,
      siteName: 'Dilo',
      locale: 'es_CO',
      type: 'article',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Dilo — Flows conversacionales con IA' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      images: ['/og-image.png'],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) notFound()

  const { content } = await compileMDX({
    source: post.content,
    components: { Cta },
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Volver
      </Link>

      <article className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-7 dark:border-[#2A2F3F] dark:bg-[#1A1D29] sm:px-7">
        <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">
          {post.frontmatter.date.toLocaleDateString('es', { dateStyle: 'long' })}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
          {post.frontmatter.title}
        </h1>
        <p className="mt-3 text-sm text-[#6B7280] dark:text-[#9CA3AF]">{post.frontmatter.description}</p>

        <div className="mt-7 dilo-prose">{content}</div>
      </article>
    </div>
  )
}

