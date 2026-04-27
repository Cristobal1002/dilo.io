import type { MetadataRoute } from 'next'
import { listBlogPosts } from '@/lib/blog'

const BASE = 'https://getdilo.io'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const posts = await listBlogPosts()

  return [
    { url: BASE, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ...posts.map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: p.frontmatter.date,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}

