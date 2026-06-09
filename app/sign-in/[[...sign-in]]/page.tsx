import { SignIn } from '@clerk/nextjs'
import { AuthPageShell } from '@/components/auth-page-shell'
import { diloClerkAppearance } from '@/lib/clerk-appearance'
import {
  authPathWithRedirect,
  isPortalContextRedirect,
  resolvePostSignInUrl,
  resolvePostSignUpUrl,
} from '@/lib/auth-redirect'

type Props = {
  searchParams: Promise<{ redirect_url?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const { redirect_url: redirectUrl } = await searchParams
  const afterAuthUrl = resolvePostSignInUrl(redirectUrl)
  const portalFlow = isPortalContextRedirect(redirectUrl)

  return (
    <AuthPageShell
      tagline={portalFlow ? 'Entra al portal de soporte de tu empresa.' : undefined}
    >
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl={authPathWithRedirect('/sign-up', redirectUrl)}
        appearance={diloClerkAppearance}
        fallbackRedirectUrl={afterAuthUrl}
        signUpFallbackRedirectUrl={resolvePostSignUpUrl(redirectUrl)}
        {...(portalFlow ? { forceRedirectUrl: afterAuthUrl } : {})}
      />
    </AuthPageShell>
  )
}
