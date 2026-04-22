// Augment Clerk's global type definitions for publicMetadata and sessionClaims.
// See: https://clerk.com/docs/references/nextjs/clerk-middleware#typescript-support

export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      onboardingCompleted?: boolean
    }
  }
}
