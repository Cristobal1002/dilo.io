import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { esES } from '@clerk/localizations'
import { diloClerkAppearance } from '@/lib/clerk-appearance'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const diloSans = Space_Grotesk({
  variable: '--font-dilo-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

/** Base para URLs absolutas en metadata (OG, etc.). El favicon lo sirve `app/favicon.ico`. */
function metadataBaseUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit) {
    try {
      return new URL(explicit)
    } catch {
      /* ignore */
    }
  }
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`)
  return new URL('http://localhost:3000')
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: 'Dilo',
  description: 'Convierte texto en flujos conversacionales inteligentes',
}

function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Dilo',
        url: 'https://getdilo.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description:
          'Herramienta para crear flows conversacionales con IA que reemplazan formularios tradicionales. Captura datos, clasifica leads y ejecuta integraciones automáticamente.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Plan gratuito disponible sin tarjeta de crédito',
        },
        featureList: [
          'Generación de flows desde texto con IA',
          'Interfaz conversacional tipo chat',
          'Scoring y clasificación automática de leads',
          'Integración con Google Sheets, n8n y webhooks',
          'Embed en cualquier sitio web',
          'Notificaciones por email al recibir respuestas',
        ],
        inLanguage: 'es',
      },
      {
        '@type': 'Organization',
        name: 'Dilo',
        url: 'https://getdilo.io',
        logo: 'https://getdilo.io/rsz_dilo.png',
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider localization={esES} appearance={diloClerkAppearance}>
      <html lang="es">
        <body className={`${diloSans.variable} font-sans antialiased`}>
          <JsonLd />
          <ToastProvider>
            {children}
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
