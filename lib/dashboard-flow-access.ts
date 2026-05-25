import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, organizations } from '@/db/schema'
import { getAuthContext } from '@/lib/auth'

export async function findDashboardFlow(flowId: string, organizationId?: string) {
  const org = organizationId
    ? await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      })
    : (await getAuthContext()).org
  if (!org) return null
  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
  })
  if (!flow) return null
  return { org, flow }
}
