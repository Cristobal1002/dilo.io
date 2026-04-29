export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function safeHttpsUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const u = new URL(url.trim())
    if (u.protocol === 'https:') return u.toString()
  } catch {
    /* ignore */
  }
  return null
}

export function hostnameForDisplay(href: string): string {
  try {
    return new URL(href).host.replace(/^www\./, '')
  } catch {
    return 'getdilo.io'
  }
}

export function scoreFillColor(score: number | null): { pct: number; fill: string; label: string } {
  if (score == null) return { pct: 0, fill: '#94a3b8', label: '—' }
  const n = Math.max(0, Math.min(100, Math.round(score)))
  const fill = n >= 70 ? '#16a34a' : n >= 40 ? '#f59e0b' : '#2563eb'
  return { pct: n, fill, label: `${n}/100` }
}

