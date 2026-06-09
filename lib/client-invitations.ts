import { randomBytes } from 'crypto'
import { and, eq, isNull, gt } from 'drizzle-orm'
import { db } from '@/db'
import { clientInvitations, clients, organizations } from '@/db/schema'
import { sendClientPortalInviteEmail } from '@/lib/email/send-client-portal-invite'
import { isClientPortalRole, type ClientPortalRole } from '@/lib/client-portal-roles'
import { addClientMember } from '@/lib/client-members-store'
import { isMissingRelation } from '@/lib/pg-relation-errors'
import { createLogger } from '@/lib/logger'
import { isResendTestRecipientOnlyError } from '@/lib/email/resend-errors'

const log = createLogger('client-invitations')

const INVITE_TTL_DAYS = 14

export class ClientPortalInviteLinkOnlyError extends Error {
  readonly inviteUrl: string
  readonly invitation: { id: string; email: string; role: ClientPortalRole }

  constructor(
    message: string,
    inviteUrl: string,
    invitation: { id: string; email: string; role: ClientPortalRole },
  ) {
    super(message)
    this.name = 'ClientPortalInviteLinkOnlyError'
    this.inviteUrl = inviteUrl
    this.invitation = invitation
  }
}

function inviteToken(): string {
  return randomBytes(24).toString('base64url')
}

function isPending(inv: typeof clientInvitations.$inferSelect): boolean {
  if (inv.acceptedAt || inv.revokedAt) return false
  return inv.expiresAt > new Date()
}

function inviteUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${appUrl}/portal-invite/${token}`
}

function toLinkOnlyIfDevTestMode(
  err: unknown,
  url: string,
  invitation: { id: string; email: string; role: ClientPortalRole },
): ClientPortalInviteLinkOnlyError | null {
  if (process.env.NODE_ENV !== 'development') return null
  const msg = err instanceof Error ? err.message : ''
  if (!isResendTestRecipientOnlyError(msg)) return null
  return new ClientPortalInviteLinkOnlyError(
    'Resend en modo prueba solo envía a tu propio correo. Copia el enlace y compártelo con la persona invitada.',
    url,
    invitation,
  )
}

async function sendInviteEmailForRow(
  row: typeof clientInvitations.$inferSelect,
  clientName: string,
  providerName: string,
) {
  const role = row.role as ClientPortalRole
  await sendClientPortalInviteEmail({
    to: row.email,
    clientName,
    providerName,
    role,
    inviteUrl: inviteUrl(row.token),
  })
}

export async function listPendingClientInvitations(clientId: string) {
  const rows = await db.query.clientInvitations.findMany({
    where: and(
      eq(clientInvitations.clientId, clientId),
      isNull(clientInvitations.acceptedAt),
      isNull(clientInvitations.revokedAt),
      gt(clientInvitations.expiresAt, new Date()),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })
  return rows.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as ClientPortalRole,
    createdAt: inv.createdAt.getTime(),
  }))
}

export async function createClientPortalInvitation(args: {
  organizationId: string
  clientId: string
  invitedByUserId: string | null
  email: string
  role: ClientPortalRole
}) {
  const normalizedEmail = args.email.trim().toLowerCase()
  if (!isClientPortalRole(args.role)) throw new Error('INVALID_ROLE')

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, args.clientId), eq(clients.organizationId, args.organizationId)),
    columns: { id: true, name: true },
  })
  if (!client) throw new Error('CLIENT_NOT_FOUND')

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, args.organizationId),
    columns: { name: true },
  })
  const providerName = org?.name ?? 'Dilo'

  const pending = await db.query.clientInvitations.findFirst({
    where: and(
      eq(clientInvitations.clientId, args.clientId),
      eq(clientInvitations.email, normalizedEmail),
      isNull(clientInvitations.acceptedAt),
      isNull(clientInvitations.revokedAt),
      gt(clientInvitations.expiresAt, new Date()),
    ),
  })

  if (pending) {
    const updated = { ...pending, role: args.role }
    if (pending.role !== args.role) {
      await db
        .update(clientInvitations)
        .set({ role: args.role })
        .where(eq(clientInvitations.id, pending.id))
    }
    try {
      await sendInviteEmailForRow(updated, client.name, providerName)
    } catch (err) {
      const linkOnly = toLinkOnlyIfDevTestMode(err, inviteUrl(pending.token), {
        id: pending.id,
        email: normalizedEmail,
        role: args.role,
      })
      if (linkOnly) throw linkOnly
      throw err
    }
    return updated
  }

  const token = inviteToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  const [row] = await db
    .insert(clientInvitations)
    .values({
      organizationId: args.organizationId,
      clientId: args.clientId,
      email: normalizedEmail,
      role: args.role,
      token,
      invitedByUserId: args.invitedByUserId,
      expiresAt,
    })
    .returning()

  try {
    await sendInviteEmailForRow(row!, client.name, providerName)
  } catch (err) {
    const linkOnly = toLinkOnlyIfDevTestMode(err, inviteUrl(row!.token), {
      id: row!.id,
      email: normalizedEmail,
      role: args.role,
    })
    if (linkOnly) throw linkOnly
    await db.delete(clientInvitations).where(eq(clientInvitations.id, row!.id))
    throw err
  }

  log.info({ clientId: args.clientId, email: normalizedEmail, role: args.role }, 'Client portal invitation created')
  return row!
}

export async function revokeClientPortalInvitation(
  organizationId: string,
  clientId: string,
  invitationId: string,
) {
  await db
    .update(clientInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(clientInvitations.id, invitationId),
        eq(clientInvitations.clientId, clientId),
        eq(clientInvitations.organizationId, organizationId),
        isNull(clientInvitations.acceptedAt),
        isNull(clientInvitations.revokedAt),
      ),
    )
}

export async function acceptPendingClientInvitesForEmail(
  clerkUserId: string,
  email: string,
  name: string | null,
) {
  const normalizedEmail = email.trim().toLowerCase()
  let pending
  try {
    pending = await db.query.clientInvitations.findMany({
      where: and(
        eq(clientInvitations.email, normalizedEmail),
        isNull(clientInvitations.acceptedAt),
        isNull(clientInvitations.revokedAt),
        gt(clientInvitations.expiresAt, new Date()),
      ),
    })
  } catch (err) {
    if (isMissingRelation(err, 'client_invitations')) {
      log.warn({}, 'client_invitations missing — run npm run db:push')
      return
    }
    throw err
  }

  for (const inv of pending) {
    if (!isClientPortalRole(inv.role)) continue
    await addClientMember({
      organizationId: inv.organizationId,
      clientId: inv.clientId,
      clerkId: clerkUserId,
      email: normalizedEmail,
      name,
      role: inv.role,
    })
    await db
      .update(clientInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(clientInvitations.id, inv.id))
    log.info({ clientId: inv.clientId, email: normalizedEmail }, 'Client portal invitation accepted on login')
  }
}

export async function acceptClientInvitationByToken(
  token: string,
  clerkUserId: string,
  email: string,
  name: string | null,
): Promise<{ clientId: string; clientName: string } | null> {
  const inv = await db.query.clientInvitations.findFirst({
    where: eq(clientInvitations.token, token),
  })
  if (!inv || !isPending(inv)) return null

  const normalizedEmail = email.trim().toLowerCase()
  if (inv.email !== normalizedEmail) throw new Error('EMAIL_MISMATCH')
  if (!isClientPortalRole(inv.role)) return null

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, inv.clientId),
    columns: { name: true },
  })

  await addClientMember({
    organizationId: inv.organizationId,
    clientId: inv.clientId,
    clerkId: clerkUserId,
    email: normalizedEmail,
    name,
    role: inv.role,
  })

  await db
    .update(clientInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(clientInvitations.id, inv.id))

  return { clientId: inv.clientId, clientName: client?.name ?? 'Cliente' }
}

export async function getClientInvitationPreview(token: string) {
  const inv = await db.query.clientInvitations.findFirst({
    where: eq(clientInvitations.token, token),
  })
  if (!inv || !isPending(inv)) return null

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, inv.clientId),
    columns: { name: true },
  })
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, inv.organizationId),
    columns: { name: true },
  })

  return {
    email: inv.email,
    role: inv.role,
    clientName: client?.name ?? 'Cliente',
    providerName: org?.name ?? 'Dilo',
  }
}
