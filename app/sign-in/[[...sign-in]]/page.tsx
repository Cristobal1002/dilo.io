import { SignIn } from '@clerk/nextjs'
import { AuthPageShell } from '@/components/auth-page-shell'
import { diloClerkAppearance } from '@/lib/clerk-appearance'

export default function SignInPage() {
  return (
    <AuthPageShell>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        appearance={diloClerkAppearance}
        forceRedirectUrl="/dashboard"
      />
    </AuthPageShell>
  )
}
