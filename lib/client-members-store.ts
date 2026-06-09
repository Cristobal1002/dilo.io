import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientMembers } from '@/db/schema'
import type { ClientPortalRole } from '@/lib/client-portal-roles'

export async function addClientMember(args: {
  organizationId: string
  clientId: string
  clerkId: string
  email: string
  name: string | null
  role: ClientPortalRole
}) {
  const existing = await db.query.clientMembers.findFirst({
    where: and(
      eq(clientMembers.clientId, args.clientId),
      eq(clientMembers.clerkId, args.clerkId),
    ),
  })
  if (existing) {
    if (existing.role !== args.role) {
      await db
        .update(clientMembers)
        .set({ role: args.role, email: args.email, name: args.name })
        .where(eq(clientMembers.id, existing.id))
    }
    return existing
  }

  const [row] = await db
    .insert(clientMembers)
    .values({
      organizationId: args.organizationId,
      clientId: args.clientId,
      clerkId: args.clerkId,
      email: args.email.trim().toLowerCase(),
      name: args.name,
      role: args.role,
    })
    .returning()

  return row!
}

export async function removeClientMember(args: {
  organizationId: string
  clientId: string
  memberId: string
}) {
  await db
    .delete(clientMembers)
    .where(
      and(
        eq(clientMembers.id, args.memberId),
        eq(clientMembers.clientId, args.clientId),
        eq(clientMembers.organizationId, args.organizationId),
      ),
    )
}
