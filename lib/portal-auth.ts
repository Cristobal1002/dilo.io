import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import {
  getClientMembershipByEmail,
  listClientMembershipsForClerk,
  listClientMembershipsForEmail,
  type ClientMembership,
} from '@/lib/client-members'
import { UnauthorizedError, ValidationError } from '@/lib/errors'
import { PORTAL_CLIENT_COOKIE } from '@/lib/portal-constants'
import { getPortalSessionEmail } from '@/lib/portal-session'
import { createLogger } from '@/lib/logger'

const log = createLogger('portal-auth')

export type PortalAuthContext = {
  email: string
  name: string | null
  memberships: ClientMembership[]
  active: ClientMembership
}

export async function listProviderMemberships(clerkUserId: string) {
  return db.query.users.findMany({
    where: eq(users.clerkId, clerkUserId),
    columns: { organizationId: true, role: true },
  })
}

export async function resolveLandingPath(clerkUserId: string): Promise<'/dashboard' | '/portal'> {
  const provider = await listProviderMemberships(clerkUserId)
  if (provider.length > 0) return '/dashboard'

  const portal = await listClientMembershipsForClerk(clerkUserId)
  if (portal.length > 0) return '/portal'

  return '/dashboard'
}

export async function isPortalOnlyUser(clerkUserId: string): Promise<boolean> {
  const provider = await listProviderMemberships(clerkUserId)
  if (provider.length > 0) return false
  const portal = await listClientMembershipsForClerk(clerkUserId)
  return portal.length > 0
}

async function readActiveClientId(
  memberships: ClientMembership[],
  preferredClientId?: string | null,
): Promise<string> {
  if (preferredClientId && memberships.some((m) => m.clientId === preferredClientId)) {
    return preferredClientId
  }

  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(PORTAL_CLIENT_COOKIE)?.value
  if (fromCookie && memberships.some((m) => m.clientId === fromCookie)) {
    return fromCookie
  }

  return memberships[0]!.clientId
}

export async function getPortalAuthContext(preferredClientId?: string | null): Promise<PortalAuthContext> {
  const email = await getPortalSessionEmail()
  if (!email) throw new UnauthorizedError('Inicia sesión en el portal')

  const memberships = await listClientMembershipsForEmail(email)
  if (memberships.length === 0) {
    throw new UnauthorizedError('No tienes acceso al portal de cliente')
  }

  const activeClientId = await readActiveClientId(memberships, preferredClientId)
  const active = memberships.find((m) => m.clientId === activeClientId)
  if (!active) throw new ValidationError('Cliente no válido')

  log.debug({ email, clientId: active.clientId }, 'Portal auth resolved')

  return {
    email,
    name: active.name,
    memberships,
    active,
  }
}

export async function requirePortalMembership(args: {
  email: string
  clientId: string
}): Promise<ClientMembership> {
  const membership = await getClientMembershipByEmail(args)
  if (!membership) throw new UnauthorizedError()
  return membership
}

/** Vincula membresías de portal cuando alguien crea cuenta Clerk con el mismo email. */
export async function linkPortalMembershipsToClerk(clerkUserId: string, email: string, name: string | null) {
  const normalizedEmail = email.trim().toLowerCase()
  const { linkPendingClientMembersByEmail } = await import('@/lib/client-portal-provision')
  await linkPendingClientMembersByEmail(clerkUserId, normalizedEmail, name)
}
