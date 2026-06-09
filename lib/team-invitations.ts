import { randomBytes } from 'crypto'
import { and, eq, isNull, gt } from 'drizzle-orm'
import { db } from '@/db'
import { organizationInvitations, organizations, users } from '@/db/schema'
import { sendTeamInviteEmail } from '@/lib/email/send-team-invite'
import { TeamInviteLinkOnlyError, toTeamInviteLinkOnlyIfDevTestMode } from '@/lib/team-invite-errors'
import { createLogger } from '@/lib/logger'
import { normalizeOrgRole, type OrgRole } from '@/lib/org-role'

const log = createLogger('team-invitations')

const INVITE_TTL_DAYS = 14

function inviteToken(): string {
  return randomBytes(24).toString('base64url')
}

function isPending(inv: typeof organizationInvitations.$inferSelect): boolean {
  if (inv.acceptedAt || inv.revokedAt) return false
  return inv.expiresAt > new Date()
}

function inviteUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${appUrl}/invite/${token}`
}

async function sendInviteEmailForRow(
  row: typeof organizationInvitations.$inferSelect,
  organizationName: string,
) {
  await sendTeamInviteEmail({
    organizationId: row.organizationId,
    to: row.email,
    organizationName,
    inviteUrl: inviteUrl(row.token),
  })
}

export async function listPendingInvitations(organizationId: string) {
  const rows = await db.query.organizationInvitations.findMany({
    where: and(
      eq(organizationInvitations.organizationId, organizationId),
      isNull(organizationInvitations.acceptedAt),
      isNull(organizationInvitations.revokedAt),
      gt(organizationInvitations.expiresAt, new Date()),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })
  return rows.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as Exclude<OrgRole, 'owner'>,
    createdAt: inv.createdAt.getTime(),
  }))
}

export async function createOrganizationInvitation(
  organizationId: string,
  invitedByUserId: string | null,
  email: string,
  role: Exclude<OrgRole, 'owner'>,
) {
  const normalizedEmail = email.trim().toLowerCase()
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  const existingMember = await db.query.users.findFirst({
    where: and(eq(users.organizationId, organizationId), eq(users.email, normalizedEmail)),
    columns: { id: true },
  })
  if (existingMember) {
    throw new Error('MEMBER_EXISTS')
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { name: true },
  })
  const organizationName = org?.name ?? 'tu workspace'

  const pending = await db.query.organizationInvitations.findFirst({
    where: and(
      eq(organizationInvitations.organizationId, organizationId),
      eq(organizationInvitations.email, normalizedEmail),
      isNull(organizationInvitations.acceptedAt),
      isNull(organizationInvitations.revokedAt),
      gt(organizationInvitations.expiresAt, new Date()),
    ),
  })

  if (pending) {
    const updated = { ...pending, role }
    if (pending.role !== role) {
      await db
        .update(organizationInvitations)
        .set({ role })
        .where(eq(organizationInvitations.id, pending.id))
    }
    try {
      await sendInviteEmailForRow(updated, organizationName)
    } catch (err) {
      const linkOnly = toTeamInviteLinkOnlyIfDevTestMode(err, inviteUrl(pending.token), {
        id: pending.id,
        email: normalizedEmail,
        role,
      })
      if (linkOnly) throw linkOnly
      throw err
    }
    log.info({ organizationId, email: normalizedEmail, role }, 'Team invitation re-sent')
    return updated
  }

  const token = inviteToken()
  const [row] = await db
    .insert(organizationInvitations)
    .values({
      organizationId,
      email: normalizedEmail,
      role,
      token,
      invitedByUserId,
      expiresAt,
    })
    .returning()

  try {
    await sendInviteEmailForRow(row!, organizationName)
  } catch (err) {
    const linkOnly = toTeamInviteLinkOnlyIfDevTestMode(err, inviteUrl(row!.token), {
      id: row!.id,
      email: normalizedEmail,
      role,
    })
    if (linkOnly) {
      log.warn({ organizationId, email: normalizedEmail }, 'Invite created without email (Resend test mode)')
      throw linkOnly
    }
    await db.delete(organizationInvitations).where(eq(organizationInvitations.id, row!.id))
    throw err
  }

  log.info({ organizationId, email: normalizedEmail, role }, 'Team invitation created')
  return row!
}

export async function revokeOrganizationInvitation(organizationId: string, invitationId: string) {
  await db
    .update(organizationInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(organizationInvitations.id, invitationId),
        eq(organizationInvitations.organizationId, organizationId),
        isNull(organizationInvitations.acceptedAt),
        isNull(organizationInvitations.revokedAt),
      ),
    )
}

async function addUserToOrganization(
  organizationId: string,
  clerkUserId: string,
  email: string,
  name: string | null,
  role: OrgRole,
) {
  const existing = await db.query.users.findFirst({
    where: and(eq(users.clerkId, clerkUserId), eq(users.organizationId, organizationId)),
  })
  if (existing) return existing

  const ownerExists = await db.query.users.findFirst({
    where: and(eq(users.organizationId, organizationId), eq(users.role, 'owner')),
    columns: { id: true },
  })
  const resolvedRole: OrgRole =
    role === 'owner' && !ownerExists ? 'owner' : role === 'owner' ? 'member' : role

  const [inserted] = await db
    .insert(users)
    .values({
      organizationId,
      clerkId: clerkUserId,
      email,
      name,
      role: resolvedRole,
    })
    .onConflictDoNothing()
    .returning()

  return (
    inserted ??
    (await db.query.users.findFirst({
      where: and(eq(users.clerkId, clerkUserId), eq(users.organizationId, organizationId)),
    }))
  )
}

export async function acceptPendingInvitesForEmail(
  clerkUserId: string,
  email: string,
  name: string | null,
) {
  const normalizedEmail = email.trim().toLowerCase()
  const pending = await db.query.organizationInvitations.findMany({
    where: and(
      eq(organizationInvitations.email, normalizedEmail),
      isNull(organizationInvitations.acceptedAt),
      isNull(organizationInvitations.revokedAt),
      gt(organizationInvitations.expiresAt, new Date()),
    ),
  })

  for (const inv of pending) {
    const role = normalizeOrgRole(inv.role)
    if (role === 'owner') continue
    await addUserToOrganization(inv.organizationId, clerkUserId, normalizedEmail, name, role)
    await db
      .update(organizationInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(organizationInvitations.id, inv.id))
    log.info({ organizationId: inv.organizationId, email: normalizedEmail }, 'Invitation accepted on login')
  }
}

export async function acceptInvitationByToken(
  token: string,
  clerkUserId: string,
  email: string,
  name: string | null,
): Promise<{ organizationId: string; organizationName: string } | null> {
  const inv = await db.query.organizationInvitations.findFirst({
    where: eq(organizationInvitations.token, token),
  })
  if (!inv || !isPending(inv)) return null

  const normalizedEmail = email.trim().toLowerCase()
  if (inv.email !== normalizedEmail) {
    throw new Error('EMAIL_MISMATCH')
  }

  const role = normalizeOrgRole(inv.role)
  if (role === 'owner') return null

  await addUserToOrganization(inv.organizationId, clerkUserId, normalizedEmail, name, role)
  await db
    .update(organizationInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(organizationInvitations.id, inv.id))

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, inv.organizationId),
    columns: { name: true },
  })

  return { organizationId: inv.organizationId, organizationName: org?.name ?? 'workspace' }
}

export async function getInvitationPreview(token: string) {
  const inv = await db.query.organizationInvitations.findFirst({
    where: eq(organizationInvitations.token, token),
  })
  if (!inv || !isPending(inv)) return null
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, inv.organizationId),
    columns: { name: true },
  })
  return {
    email: inv.email,
    role: inv.role,
    organizationName: org?.name ?? 'workspace',
  }
}

export { TeamInviteLinkOnlyError } from '@/lib/team-invite-errors'
