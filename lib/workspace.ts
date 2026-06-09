/**
 * Workspace Dilo (organizations + users). Auth de usuarios sigue en Clerk;
 * no usamos Clerk Organizations: el workspace vive solo en Neon.
 */
import { and, count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, organizations, users } from '@/db/schema'
import { acceptPendingInvitesForEmail } from '@/lib/team-invitations'
import { acceptPendingClientInvitesForEmail } from '@/lib/client-invitations'
import { listClientMembershipsForClerk } from '@/lib/client-members'
import { PortalOnlyUserError } from '@/lib/errors'
import { isMissingRelation } from '@/lib/pg-relation-errors'
import { createLogger } from '@/lib/logger'
import type { OrgRole } from '@/lib/org-role'

const log = createLogger('workspace')

function isOrganizationsSlugConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('code' in err)) return false
  if (String((err as { code: unknown }).code) !== '23505') return false
  const constraint =
    'constraint' in err ? String((err as { constraint: unknown }).constraint) : ''
  return !constraint || constraint === 'organizations_slug_unique'
}

async function findOrganizationByClerkSlug(clerkUserId: string) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, clerkUserId),
  })
  return org ?? null
}

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
export type EnsureWorkspaceOptions = {
  /** Crear workspace aunque el usuario solo tenga acceso al portal de cliente. */
  forceCreate?: boolean
}

export async function ensureWorkspaceForUser(
  clerkUserId: string,
  email: string,
  name: string | null,
  options?: EnsureWorkspaceOptions,
): Promise<WorkspaceContext> {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail) {
    try {
      await acceptPendingInvitesForEmail(clerkUserId, normalizedEmail, name)
    } catch (err) {
      if (!isMissingRelation(err, 'organization_invitations')) throw err
      log.warn({}, 'organization_invitations missing — run npm run db:push')
    }
    try {
      await acceptPendingClientInvitesForEmail(clerkUserId, normalizedEmail, name)
    } catch (err) {
      if (!isMissingRelation(err, 'client_invitations')) throw err
      log.warn({}, 'client_invitations missing — run npm run db:push')
    }
    try {
      const { linkPendingClientMembersByEmail } = await import('@/lib/client-portal-provision')
      await linkPendingClientMembersByEmail(clerkUserId, normalizedEmail, name)
    } catch (err) {
      if (!isMissingRelation(err, 'client_members')) throw err
      log.warn({}, 'client_members missing — run npm run db:push')
    }
  }

  const memberships = await db.query.users.findMany({
    where: eq(users.clerkId, clerkUserId),
    columns: { organizationId: true, role: true },
  })

  if (memberships.length === 0 && !options?.forceCreate) {
    const portalMemberships = await listClientMembershipsForClerk(clerkUserId)
    if (portalMemberships.length > 0) {
      throw new PortalOnlyUserError()
    }
  }

  let org = await pickPrimaryOrganization(clerkUserId, memberships)

  if (!org) {
    const displayName = name?.trim() || 'Mi workspace'
    org = await findOrganizationByClerkSlug(clerkUserId)

    if (!org) {
      try {
        const [created] = await db
          .insert(organizations)
          .values({ name: displayName, slug: clerkUserId })
          .returning()
        org = created
        log.info({ clerkUserId, orgId: org.id }, 'Created primary workspace')
      } catch (err) {
        if (!isOrganizationsSlugConflict(err)) throw err
        org = await findOrganizationByClerkSlug(clerkUserId)
        if (!org) throw err
        log.debug({ clerkUserId, orgId: org.id }, 'Reused workspace after slug conflict')
      }
    } else {
      log.debug({ clerkUserId, orgId: org.id }, 'Linked existing workspace by slug')
    }

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