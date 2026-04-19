import { SignUp } from '@clerk/nextjs'
import { AuthPageShell } from '@/components/auth-page-shell'
import { diloClerkAppearance } from '@/lib/clerk-appearance'

export default function SignUpPage() {
  return (
    <AuthPageShell tagline="Crea flows con IA y captura respuestas en una conversación.">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={diloClerkAppearance}
        forceRedirectUrl="/dashboard"
      />
    </AuthPageShell>
  )
}
