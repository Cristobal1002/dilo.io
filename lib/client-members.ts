import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientMembers, clients, organizations } from '@/db/schema'
import type { ClientPortalRole } from '@/lib/client-portal-roles'

export type ClientMembership = {
  id: string
  clientId: string
  clientName: string
  organizationId: string
  organizationName: string
  organizationLogoUrl: string | null
  clientLogoUrl: string | null
  role: ClientPortalRole
  email: string
}

export async function listClientMembershipsForClerk(clerkId: string): Promise<ClientMembership[]> {
  const rows = await db
    .select({
      id: clientMembers.id,
      clientId: clientMembers.clientId,
      clientName: clients.name,
      organizationId: clientMembers.organizationId,
      organizationName: organizations.name,
      organizationLogoUrl: organizations.logoUrl,
      clientLogoUrl: clients.logoUrl,
      role: clientMembers.role,
      email: clientMembers.email,
    })
    .from(clientMembers)
    .innerJoin(clients, eq(clients.id, clientMembers.clientId))
    .innerJoin(organizations, eq(organizations.id, clientMembers.organizationId))
    .where(eq(clientMembers.clerkId, clerkId))

  return rows.map((r) => ({
    ...r,
    role: r.role as ClientPortalRole,
  }))
}

export async function getClientMembership(args: {
  clerkId: string
  clientId: string
}): Promise<ClientMembership | null> {
  const rows = await listClientMembershipsForClerk(args.clerkId)
  return rows.find((m) => m.clientId === args.clientId) ?? null
}

export async function hasClientPortalAccess(clerkId: string): Promise<boolean> {
  const row = await db.query.clientMembers.findFirst({
    where: eq(clientMembers.clerkId, clerkId),
    columns: { id: true },
  })
  return Boolean(row)
}

export async function listClientMembersForClient(clientId: string) {
  return db.query.clientMembers.findMany({
    where: eq(clientMembers.clientId, clientId),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })
}
