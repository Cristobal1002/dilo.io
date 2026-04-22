import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/landing/landing-page'

export const metadata = {
  title: 'Dilo — Flows conversacionales que convierten',
  description: 'Reemplaza tus formularios con flows conversacionales. Más contexto, menos fricción, cero código.',
}

export default async function RootPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')
  return <LandingPage />
}
