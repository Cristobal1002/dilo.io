import type { MetadataRoute } from 'next'
import { listBlogPosts } from '@/lib/blog'
import { absoluteSiteOrigin } from '@/lib/site-url'

/** Rutas estáticas públicas que existen en `app/` (sin /dashboard, /api, auth). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = absoluteSiteOrigin()
  const now = new Date()
  const posts = await listBlogPosts()

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/vs-involve-me`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/casos/consultores`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/casos/agencias`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/discovery`, lastModified: now, changeFrequency: 'monthly', priority: 0.65 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.frontmatter.date,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
