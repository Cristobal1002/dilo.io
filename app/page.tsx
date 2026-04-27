import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/landing/landing-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dilo — Crea flows conversacionales con IA en 20 segundos',
  description:
    'Reemplaza tus formularios con flows conversacionales inteligentes. Captura datos, clasifica leads y activa integraciones automáticamente. Gratis para empezar.',
  keywords: [
    'formulario conversacional',
    'formulario IA gratis',
    'alternativa Typeform gratis',
    'flow conversacional',
    'captura de leads con IA',
  ],
  openGraph: {
    title: 'Dilo — Flows conversacionales que convierten',
    description: 'En 20 segundos tienes un flow activo, publicado y recibiendo respuestas — gratis.',
    url: 'https://getdilo.io',
    siteName: 'Dilo',
    locale: 'es_CO',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Dilo — Flows conversacionales con IA' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dilo — Flows conversacionales con IA',
    description: 'En 20 segundos tienes un flow activo y recibiendo respuestas — gratis.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://getdilo.io' },
}

export default async function RootPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')
  return <LandingPage />
}
