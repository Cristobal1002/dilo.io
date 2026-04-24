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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider localization={esES} appearance={diloClerkAppearance}>
      <html lang="es">
        <body className={`${diloSans.variable} font-sans antialiased`}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
