import { publicAppBaseUrl } from '@/lib/outreach'

function normalizeRedirectPath(redirectUrl: string): string {
  const trimmed = redirectUrl.trim()
  if (!trimmed) return '/'
  if (trimmed.startsWith('/')) return trimmed
  try {
    const base = publicAppBaseUrl()
    const url = new URL(trimmed, base)
    const baseOrigin = new URL(base).origin
    if (url.origin !== baseOrigin) return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

/** Rutas post-auth que pertenecen al portal de cliente (no onboarding de partner). */
export function isPortalContextRedirect(redirectUrl: string | null | undefined): boolean {
  if (!redirectUrl?.trim()) return false
  const path = normalizeRedirectPath(redirectUrl)
  return path === '/portal' || path.startsWith('/portal?') || path.startsWith('/portal-invite/')
}

export function resolvePostSignUpUrl(redirectUrl?: string | null): string {
  if (isPortalContextRedirect(redirectUrl)) {
    return normalizeRedirectPath(redirectUrl!)
  }
  return '/onboarding'
}

export function resolvePostSignInUrl(redirectUrl?: string | null): string {
  if (redirectUrl?.trim()) {
    return normalizeRedirectPath(redirectUrl)
  }
  return '/dashboard'
}

export function portalSignInUrl(returnPath = '/portal'): string {
  return `/sign-in?redirect_url=${encodeURIComponent(returnPath)}`
}

export function portalSignUpUrl(returnPath = '/portal'): string {
  return `/sign-up?redirect_url=${encodeURIComponent(returnPath)}`
}
