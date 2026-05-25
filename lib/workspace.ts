/**
 * Workspace Dilo (organizations + users). Auth de usuarios sigue en Clerk;
 * no usamos Clerk Organizations: el workspace vive solo en Neon.
 */
import { and, count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, organizations, users } from '@/db/schema'
import { acceptPendingInvitesForEmail } from '@/lib/team-invitations'
import { isMissingRelation } from '@/lib/pg-relation-errors'
import { createLogger } from '@/lib/logger'
import type { OrgRole } from '@/lib/org-role'

const log = createLogger('workspace')

async function countFlowsForOrg(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(flows)
    .where(eq(flows.organizationId, organizationId))
  return row?.count ?? 0
}

function hasOnboardingData(org: typeof organizations.$inferSelect): boolean {
  const data = org.onboardingData
  return Boolean(data && typeof data === 'object' && Object.keys(data as object).length > 0)
}

/** Elige el workspace principal entre las membresías del usuario. */
async function pickPrimaryOrganization(
  clerkUserId: string,
  memberships: { organizationId: string; role: string }[],
): Promise<typeof organizations.$inferSelect | null> {
  const candidates: Array<{
    org: typeof organizations.$inferSelect
    role: string
    flowCount: number
    score: number
  }> = []

  for (const m of memberships) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, m.organizationId),
    })
    if (!org) continue
    const flowCount = await countFlowsForOrg(org.id)
    let score = flowCount * 10
    if (m.role === 'owner') score += 100
    if (hasOnboardingData(org)) score += 50
    if (org.slug === clerkUserId) score += 5
    candidates.push({ org, role: m.role, flowCount, score })
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]!.org
}

export type WorkspaceContext = {
  org: typeof organizations.$inferSelect
  orgRole: OrgRole
}

/**
 * Resuelve o crea el workspace del usuario. Intenta aplicar invitaciones pendientes por email.
 */
export async function ensureWorkspaceForUser(
  clerkUserId: string,
  email: string,
  name: string | null,
): Promise<WorkspaceContext> {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail) {
    try {
      await acceptPendingInvitesForEmail(clerkUserId, normalizedEmail, name)
    } catch (err) {
      if (!isMissingRelation(err, 'organization_invitations')) throw err
      log.warn({}, 'organization_invitations missing — run npm run db:push')
    }
  }

  const memberships = await db.query.users.findMany({
    where: eq(users.clerkId, clerkUserId),
    columns: { organizationId: true, role: true },
  })

  let org = await pickPrimaryOrganization(clerkUserId, memberships)

  if (!org) {
    const displayName = name?.trim() || 'Mi workspace'
    const [created] = await db
      .insert(organizations)
      .values({ name: displayName, slug: clerkUserId })
      .returning()
    org = created
    log.info({ clerkUserId, orgId: org.id }, 'Created primary workspace')

    await db
      .insert(users)
      .values({
        organizationId: org.id,
        clerkId: clerkUserId,
        email: normalizedEmail || email,
        name,
        role: 'owner',
      })
      .onConflictDoNothing()

    return { org, orgRole: 'owner' }
  }

  let userRow = await db.query.users.findFirst({
    where: and(eq(users.clerkId, clerkUserId), eq(users.organizationId, org.id)),
    columns: { role: true },
  })

  if (!userRow) {
    const ownerExists = await db.query.users.findFirst({
      where: and(eq(users.organizationId, org.id), eq(users.role, 'owner')),
      columns: { id: true },
    })
    const role: OrgRole = ownerExists ? 'member' : 'owner'
    await db
      .insert(users)
      .values({
        organizationId: org.id,
        clerkId: clerkUserId,
        email: normalizedEmail || email,
        name,
        role,
      })
      .onConflictDoNothing()
    userRow = await db.query.users.findFirst({
      where: and(eq(users.clerkId, clerkUserId), eq(users.organizationId, org.id)),
      columns: { role: true },
    })
  }

  const orgRole = (userRow?.role === 'owner' || userRow?.role === 'admin' || userRow?.role === 'member'
    ? userRow.role
    : 'member') as OrgRole

  return { org, orgRole }
}