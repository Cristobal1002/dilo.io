import { SignUp } from '@clerk/nextjs'
import { AuthPageShell } from '@/components/auth-page-shell'
import { diloClerkAppearance } from '@/lib/clerk-appearance'
import {
  authPathWithRedirect,
  isPortalContextRedirect,
  resolvePostSignUpUrl,
} from '@/lib/auth-redirect'

type Props = {
  searchParams: Promise<{ redirect_url?: string }>
}

export default async function SignUpPage({ searchParams }: Props) {
  const { redirect_url: redirectUrl } = await searchParams
  const afterAuthUrl = resolvePostSignUpUrl(redirectUrl)
  const portalFlow = isPortalContextRedirect(redirectUrl)

  return (
    <AuthPageShell
      tagline={
        portalFlow
          ? 'Crea tu cuenta para el portal de soporte de tu empresa.'
          : 'Crea flows con IA y captura respuestas en una conversación.'
      }
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={authPathWithRedirect('/sign-in', redirectUrl)}
        appearance={diloClerkAppearance}
        fallbackRedirectUrl={afterAuthUrl}
        signInFallbackRedirectUrl={afterAuthUrl}
        {...(portalFlow ? { forceRedirectUrl: afterAuthUrl } : {})}
      />
    </AuthPageShell>
  )
}
