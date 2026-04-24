/**
 * Origen público de la app (sin barra final).
 * En cliente usa `NEXT_PUBLIC_APP_URL` si existe; si no, `window.location.origin`.
 */
export function publicAppOrigin(): string {
  const fromEnv = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
  if (typeof window !== 'undefined') {
    const base = (fromEnv || window.location.origin).replace(/\/$/, '')
    return base
  }
  return (fromEnv || 'http://localhost:3000').replace(/\/$/, '')
}
