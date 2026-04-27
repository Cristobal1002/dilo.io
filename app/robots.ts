import type { MetadataRoute } from 'next'
import { absoluteSiteOrigin } from '@/lib/site-url'

/** `disallow` solo para prefijos que existen en la app y no deben indexarse. */
export default function robots(): MetadataRoute.Robots {
  const base = absoluteSiteOrigin()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/onboarding/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
