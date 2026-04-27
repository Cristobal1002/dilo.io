import type { MetadataRoute } from 'next'

const BASE = 'https://getdilo.io'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: BASE, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/vs-involve-me`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/blog/que-es-un-formulario-conversacional`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog/formulario-ia-gratis`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/casos/consultores`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/casos/agencias`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}

