/** Logo y visibilidad en surfaces públicas del flow (/f/:id). */

export function flowSettingsRecord(settings: unknown): Record<string, unknown> {
  return settings && typeof settings === 'object' && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)
    : {}
}

/** URL https del logo (flow `logo_url` o inyectada desde el workspace al publicar). */
export function resolvePublicFlowLogoUrl(settings: unknown): string | null {
  const u = flowSettingsRecord(settings).logo_url
  return typeof u === 'string' && /^https?:\/\//.test(u) ? u : null
}

/**
 * Si el logo se muestra en bienvenida y cabecera del chat.
 * Por defecto `true`; solo se oculta con `show_logo === false`.
 */
export function isPublicFlowLogoEnabled(settings: unknown): boolean {
  return flowSettingsRecord(settings).show_logo !== false
}

/** Logo listo para renderizar, o `null` si está deshabilitado o no hay URL. */
export function publicFlowLogoForDisplay(settings: unknown): string | null {
  if (!isPublicFlowLogoEnabled(settings)) return null
  return resolvePublicFlowLogoUrl(settings)
}
