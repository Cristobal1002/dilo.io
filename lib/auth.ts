/**
 * lib/auth.ts
 * Auth helpers for API routes.
 *
 * Centralizes the "get or create org" pattern that every authenticated
 * route needs, keeping route handlers focused on business logic.
 */
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, users } from '@/db/schema'
import { UnauthorizedError } from './errors'
import { createLogger } from './logger'

const log = createLogger('auth')

export type AuthContext = {
  userId: string
  orgId: string
  org: typeof organizations.$inferSelect
}

/**
 * Resolves the authenticated user and their organization.
 * Creates both lazily on first use (no separate onboarding step needed).
 * Throws UnauthorizedError if the user is not logged in.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const { userId, orgId, orgSlug } = await auth()

  if (!userId) throw new UnauthorizedError()

  const identifier = orgId ?? userId
  const displayName = orgSlug ?? 'Mi organización'

  let org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, identifier),
  })

  if (!org) {
    log.info({ userId, identifier }, 'Creating new organization on first login')

    const [newOrg] = await db
      .insert(organizations)
      .values({ name: displayName, slug: identifier })
      .returning()

    org = newOrg

    await db
      .insert(users)
      .values({
        organizationId: org.id,
        clerkId: userId,
        email: '',
        role: 'owner',
      })
      .onConflictDoNothing()
  }

  return { userId, orgId: identifier, org }
}
