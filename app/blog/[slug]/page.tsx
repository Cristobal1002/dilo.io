import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { getBlogPost, listBlogSlugs } from '@/lib/blog'
import { Cta } from '@/components/blog/mdx-cta'

function FaqJsonLd({ items, pageUrl }: { items: { q: string; a: string }[]; pageUrl: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: pageUrl,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

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

  const pageUrl = post.frontmatter.canonical ?? `https://getdilo.io/blog/${post.slug}`
  const faq = post.frontmatter.faq

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      {faq && faq.length > 0 ? <FaqJsonLd items={faq} pageUrl={pageUrl} /> : null}

      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-[rgba(124,58,237,0.25)] hover:text-foreground dark:bg-[#161a26]/80"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver al blog
      </Link>

      <article className="overflow-hidden rounded-3xl border border-[rgba(124,58,237,0.12)] bg-surface/95 shadow-xl shadow-dilo-500/6 backdrop-blur-sm dark:border-[rgba(124,58,237,0.2)] dark:bg-[#12151f]/95 dark:shadow-black/40">
        <div className="h-1 w-full bg-linear-to-r from-dilo-500 via-dilo-600 to-mint-500" aria-hidden />

        <div className="px-5 py-9 sm:px-10 sm:py-11 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-2xl">
            <time
              dateTime={post.frontmatter.date.toISOString()}
              className="inline-flex items-center rounded-full bg-dilo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-dilo-600 dark:bg-[rgba(124,58,237,0.2)] dark:text-[#DDD6FE]"
            >
              {post.frontmatter.date.toLocaleDateString('es', { dateStyle: 'long' })}
            </time>

            <h1 className="mt-5 text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
              {post.frontmatter.title}
            </h1>

            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {post.frontmatter.description}
            </p>

            <div className="dilo-prose dilo-prose--blog mt-10 border-t border-border-subtle pt-10">{content}</div>
          </div>
        </div>
      </article>
    </div>
  )
}
