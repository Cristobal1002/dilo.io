/**
 * lib/auth.ts
 * Auth helpers for API routes.
 *
 * Centralizes the "get or create org" pattern that every authenticated
 * route needs, keeping route handlers focused on business logic.
 */
import { auth, currentUser } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, users } from '@/db/schema'
import { normalizeOrgRole, type OrgRole } from '@/lib/org-role'
import { UnauthorizedError } from './errors'
import { createLogger } from './logger'

const log = createLogger('auth')

export type AuthContext = {
  userId: string
  orgId: string
  org: typeof organizations.$inferSelect
  /** Rol del usuario autenticado dentro de `org` (tabla `users.role`). */
  orgRole: OrgRole
}

/**
 * Resolves the authenticated user and their organization.
 * Creates both lazily on first use. Reads real name + email from Clerk.
 * Throws UnauthorizedError if the user is not logged in.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const { userId, orgId, orgSlug } = await auth()

  if (!userId) throw new UnauthorizedError()

  const identifier = orgId ?? userId
  const displayName = orgSlug ?? 'Mi organización'

  // Read real user data from Clerk once — used for both org and user creation
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''
  const firstName = clerkUser?.firstName ?? ''
  const lastName = clerkUser?.lastName ?? ''
  const name = [firstName, lastName].filter(Boolean).join(' ') || null

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
  }

  // Always ensure the user record exists — covers cases where the org was
  // created but the user insert failed (e.g. missing column in a prior deploy).
  const existingUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
    columns: { id: true },
  })

  if (!existingUser) {
    log.info({ userId, email, name }, 'Creating user record')
    await db
      .insert(users)
      .values({
        organizationId: org.id,
        clerkId: userId,
        email,
        name,
        role: 'owner',
      })
      .onConflictDoNothing()
  }

  const userRow = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
    columns: { role: true },
  })
  const orgRole = normalizeOrgRole(userRow?.role)

  return { userId, orgId: identifier, org, orgRole }
}
