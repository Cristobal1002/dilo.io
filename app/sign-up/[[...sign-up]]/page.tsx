import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-linear-to-br from-dilo-50 via-background to-mint-500/5">
      <p className="mb-6 text-sm font-semibold tracking-tight text-foreground">
        <span className="text-2xl font-bold bg-linear-to-r from-dilo-500 to-mint-500 bg-clip-text text-transparent">
          Dilo
        </span>
      </p>
      <div className="w-full max-w-md [&_.cl-card]:shadow-lg [&_.cl-card]:border-border [&_.cl-card]:rounded-2xl">
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
      </div>
    </div>
  )
}
