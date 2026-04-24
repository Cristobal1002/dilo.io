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

export const metadata: Metadata = {
  title: 'Dilo',
  description: 'Convierte texto en flujos conversacionales inteligentes',
  icons: {
    icon: '/favicon.ico',
  },
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
