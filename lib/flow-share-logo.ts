/** Logo HTTPS del flow (`settings.logo_url`) o del workspace; para QR opcional. */
export function resolveFlowShareLogoUrl(
  settings: unknown,
  workspaceLogoUrl: string | null | undefined,
): string | null {
  const o =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {}
  const flowLogo = typeof o.logo_url === 'string' && /^https:\/\//i.test(o.logo_url.trim()) ? o.logo_url.trim() : null
  if (flowLogo) return flowLogo
  const w = typeof workspaceLogoUrl === 'string' ? workspaceLogoUrl.trim() : ''
  if (w && /^https:\/\//i.test(w)) return w
  return null
}
