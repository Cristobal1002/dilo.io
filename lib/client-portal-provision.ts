import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { clientMembers, clients, organizations } from '@/db/schema'
import { PortalLoginCodeEmailError } from '@/lib/email/send-portal-code'
import { issuePortalLoginCode, portalEntrarUrl } from '@/lib/portal-login-codes'
import { isClientPortalRole, type ClientPortalRole } from '@/lib/client-portal-roles'
import { ConflictError, ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('client-portal-provision')

export class ClientPortalAccessLinkOnlyError extends Error {
  readonly portalUrl: string
  readonly member: { id: string; email: string; role: ClientPortalRole }

  constructor(
    message: string,
    portalUrl: string,
    member: { id: string; email: string; role: ClientPortalRole },
  ) {
    super(message)
    this.name = 'ClientPortalAccessLinkOnlyError'
    this.portalUrl = portalUrl
    this.member = member
  }
}


export async function linkPendingClientMembersByEmail(
  clerkId: string,
  email: string,
  name: string | null,
): Promise<number> {
  const normalizedEmail = email.trim().toLowerCase()
  const pending = await db.query.clientMembers.findMany({
    where: and(eq(clientMembers.email, normalizedEmail), isNull(clientMembers.clerkId)),
  })

  let linked = 0
  for (const row of pending) {
    const clash = await db.query.clientMembers.findFirst({
      where: and(eq(clientMembers.clientId, row.clientId), eq(clientMembers.clerkId, clerkId)),
      columns: { id: true },
    })
    if (clash) {
      await db.delete(clientMembers).where(eq(clientMembers.id, row.id))
      continue
    }

    await db
      .update(clientMembers)
      .set({
        clerkId,
        name: row.name ?? name,
      })
      .where(eq(clientMembers.id, row.id))
    linked++
    log.info({ clientId: row.clientId, email: normalizedEmail }, 'Client portal member linked on login')
  }

  return linked
}

export async function provisionClientPortalMember(args: {
  organizationId: string
  clientId: string
  email: string
  name: string | null
  role: ClientPortalRole
  sendEmail: boolean
}) {
  const normalizedEmail = args.email.trim().toLowerCase()
  if (!isClientPortalRole(args.role)) throw new Error('INVALID_ROLE')

  const existing = await db.query.clientMembers.findFirst({
    where: and(eq(clientMembers.clientId, args.clientId), eq(clientMembers.email, normalizedEmail)),
  })
  if (existing) {
    if (existing.clerkId) {
      throw new ConflictError('Ese correo ya tiene acceso activo al portal de este cliente')
    }
    await db
      .update(clientMembers)
      .set({
        role: args.role,
        name: args.name?.trim() || existing.name,
      })
      .where(eq(clientMembers.id, existing.id))
  } else {
    await db.insert(clientMembers).values({
      organizationId: args.organizationId,
      clientId: args.clientId,
      clerkId: null,
      email: normalizedEmail,
      name: args.name?.trim() || null,
      role: args.role,
    })
  }

  const member = await db.query.clientMembers.findFirst({
    where: and(eq(clientMembers.clientId, args.clientId), eq(clientMembers.email, normalizedEmail)),
  })
  if (!member) throw new Error('MEMBER_NOT_FOUND')

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, args.clientId),
    columns: { name: true },
  })
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, args.organizationId),
    columns: { name: true },
  })

  const accessUrl = portalEntrarUrl({ email: normalizedEmail })

  if (!args.sendEmail) {
    return { member, portalUrl: accessUrl, emailed: false as const }
  }

  try {
    await issuePortalLoginCode({
      email: normalizedEmail,
      clientName: client?.name ?? 'Cliente',
      providerName: org?.name ?? 'Dilo',
    })
  } catch (err) {
    if (err instanceof PortalLoginCodeEmailError || err instanceof ValidationError) {
      throw new ClientPortalAccessLinkOnlyError(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar el correo. Comparte el enlace al portal con la persona.',
        accessUrl,
        { id: member.id, email: normalizedEmail, role: args.role },
      )
    }
    throw err
  }

  return { member, portalUrl: accessUrl, emailed: true as const }
}
