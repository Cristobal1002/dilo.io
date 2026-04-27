import LandingPageClient from './landing-page-client'

/**
 * Landing wrapper (Server Component).
 * El contenido interactivo vive en `landing-page-client.tsx`.
 */
export default function LandingPage() {
  return <LandingPageClient />
}

