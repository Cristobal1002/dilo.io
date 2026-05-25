/**
 * lib/auth.ts
 * Auth helpers for API routes.
 */
import { currentUser } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { preferOrganizationWithFlows } from '@/lib/workspace-repair'
import { ensureWorkspaceForUser } from '@/lib/workspace'
import { normalizeOrgRole, type OrgRole } from '@/lib/org-role'
import { UnauthorizedError } from './errors'
import { getDatabaseConnectionInfo } from '@/lib/database-info'
import { createLogger } from './logger'

const log = createLogger('auth')

export type AuthContext = {
  userId: string
  org: typeof import('@/db/schema').organizations.$inferSelect
  orgRole: OrgRole
}

/**
 * Resolves the authenticated user and their Dilo workspace (Neon).
 * Clerk solo autentica usuarios; no usamos Clerk Organizations.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const clerkUser = await currentUser()
  if (!clerkUser?.id) throw new UnauthorizedError()

  const userId = clerkUser.id
  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? ''
  const firstName = clerkUser.firstName ?? ''
  const lastName = clerkUser.lastName ?? ''
  const name = [firstName, lastName].filter(Boolean).join(' ') || null

  let { org, orgRole } = await ensureWorkspaceForUser(userId, email, name)
  org = await preferOrganizationWithFlows(userId, org)

  const userRow = await db.query.users.findFirst({
    where: and(eq(users.clerkId, userId), eq(users.organizationId, org.id)),
    columns: { role: true },
  })
  orgRole = normalizeOrgRole(userRow?.role ?? orgRole)

  const dbInfo = getDatabaseConnectionInfo()
  log.debug(
    {
      dbHost: dbInfo?.host,
      dbBranchHint: dbInfo?.branchHint,
      diloOrgId: org.id,
      orgRole,
    },
    'Auth context resolved',
  )

  return { userId, org, orgRole }
}

/** Usuario autenticado en el workspace actual (para rutas que necesitan `users.id`). */
export async function getAuthUserInOrg(auth: AuthContext) {
  return db.query.users.findFirst({
    where: and(eq(users.clerkId, auth.userId), eq(users.organizationId, auth.org.id)),
  })
}
