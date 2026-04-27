/**
 * Origen absoluto (https, sin barra final) para sitemap, robots y URLs canónicas en servidor.
 * Alineado con `metadataBase` en `app/layout.tsx`.
 */
export function absoluteSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit) {
    try {
      return new URL(explicit).origin
    } catch {
      /* ignore */
    }
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://getdilo.io'
}
