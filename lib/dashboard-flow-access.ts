import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, organizations } from '@/db/schema'

export async function findDashboardFlow(flowId: string, orgIdentifier: string) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgIdentifier),
  })
  if (!org) return null
  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
  })
  if (!flow) return null
  return { org, flow }
}
