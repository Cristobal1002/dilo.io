import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, organizations, users } from '@/db/schema'
import { createLogger } from '@/lib/logger'

const log = createLogger('workspace-repair')

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

/** Libera `targetSlug` si otra fila lo usa sin flows (org vacía duplicada). */
export async function claimOrganizationSlug(targetSlug: string, keepOrganizationId: string) {
  const conflict = await db.query.organizations.findFirst({
    where: eq(organizations.slug, targetSlug),
  })
  if (!conflict || conflict.id === keepOrganizationId) return

  const flowCount = await countFlowsForOrg(conflict.id)
  if (flowCount > 0) return

  log.info({ slug: targetSlug, removeOrgId: conflict.id, keepOrganizationId }, 'Removing empty duplicate organization')
  await db.delete(organizations).where(eq(organizations.id, conflict.id))
}

/**
 * Si el workspace resuelto está vacío pero el usuario tiene otro con flows u onboarding,
 * usa ese como principal.
 */
export async function preferOrganizationWithFlows(
  userId: string,
  currentOrg: typeof organizations.$inferSelect,
): Promise<typeof organizations.$inferSelect> {
  const currentFlows = await countFlowsForOrg(currentOrg.id)
  if (currentFlows > 0 || hasOnboardingData(currentOrg)) return currentOrg

  const memberships = await db.query.users.findMany({
    where: eq(users.clerkId, userId),
    columns: { organizationId: true },
  })

  for (const m of memberships) {
    if (m.organizationId === currentOrg.id) continue
    const other = await db.query.organizations.findFirst({
      where: eq(organizations.id, m.organizationId),
    })
    if (!other) continue

    const otherFlows = await countFlowsForOrg(other.id)
    if (otherFlows === 0 && !hasOnboardingData(other)) continue

    log.info({ userId, from: currentOrg.id, to: other.id }, 'Prefer workspace with flows or onboarding')
    return other
  }

  return currentOrg
}
