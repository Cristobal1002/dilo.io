import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { plans, users } from '@/db/schema'
import { PLAN_LIMITS } from '@/lib/plan-limits'
import { listPendingInvitations } from '@/lib/team-invitations'

export async function getMembersLimit(planId: string): Promise<number> {
  const planRow = await db.query.plans.findFirst({
    where: eq(plans.id, planId),
    columns: { membersLimit: true },
  })
  if (planRow) return planRow.membersLimit
  const fallback = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free
  return fallback.members
}

export async function countOrgMembers(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.organizationId, organizationId))
  return row?.count ?? 0
}

export function isWithinMembersLimit(currentTotal: number, limit: number): boolean {
  if (limit === -1) return true
  return currentTotal < limit
}

/** Miembros en BD + invitaciones pendientes en Dilo. */
export async function countTeamSlotsUsed(organizationId: string): Promise<{
  members: number
  pendingInvites: number
  total: number
}> {
  const members = await countOrgMembers(organizationId)
  const pending = await listPendingInvitations(organizationId)
  const pendingInvites = pending.length
  return { members, pendingInvites, total: members + pendingInvites }
}
