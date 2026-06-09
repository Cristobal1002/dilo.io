import { cookies } from 'next/headers'
import { currentUser } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import {
  getClientMembership,
  listClientMembershipsForClerk,
  type ClientMembership,
} from '@/lib/client-members'
import { UnauthorizedError, ValidationError } from '@/lib/errors'
import { PORTAL_CLIENT_COOKIE } from '@/lib/portal-constants'
import { createLogger } from '@/lib/logger'

const log = createLogger('portal-auth')

export type PortalAuthContext = {
  clerkUserId: string
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
  const clerkUser = await currentUser()
  if (!clerkUser?.id) throw new UnauthorizedError()

  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? ''
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

  const { linkPendingClientMembersByEmail } = await import('@/lib/client-portal-provision')
  if (email) {
    await linkPendingClientMembersByEmail(clerkUser.id, email, name)
  }

  const memberships = await listClientMembershipsForClerk(clerkUser.id)
  if (memberships.length === 0) {
    throw new UnauthorizedError('No tienes acceso al portal de cliente')
  }

  const activeClientId = await readActiveClientId(memberships, preferredClientId)
  const active = memberships.find((m) => m.clientId === activeClientId)
  if (!active) throw new ValidationError('Cliente no válido')

  log.debug({ clerkUserId: clerkUser.id, clientId: active.clientId }, 'Portal auth resolved')

  return {
    clerkUserId: clerkUser.id,
    email,
    name,
    memberships,
    active,
  }
}

export async function requirePortalMembership(args: {
  clerkId: string
  clientId: string
}): Promise<ClientMembership> {
  const membership = await getClientMembership(args)
  if (!membership) throw new UnauthorizedError()
  return membership
}
