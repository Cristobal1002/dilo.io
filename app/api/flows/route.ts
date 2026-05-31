import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { withApiHandler } from '@/lib/with-api-handler'

/** Lista flows del workspace (para selectores en configuración). */
export const GET = withApiHandler(async (_req, { auth }) => {
  const rows = await db.query.flows.findMany({
    where: eq(flows.organizationId, auth.org.id),
    columns: { id: true, name: true, status: true, updatedAt: true },
    orderBy: [desc(flows.updatedAt)],
    limit: 200,
  })
  return apiSuccess({ flows: rows })
}, { requireAuth: true })
