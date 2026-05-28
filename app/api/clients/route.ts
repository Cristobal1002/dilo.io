import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { ensureClientByName } from '@/lib/support-clients'
import { withApiHandler } from '@/lib/with-api-handler'

export const GET = withApiHandler(async (_req: NextRequest, { auth }) => {
  const rows = await db.query.clients.findMany({
    where: eq(clients.organizationId, auth.org.id),
    columns: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
    orderBy: [asc(clients.name)],
  })
  return apiSuccess({ clients: rows })
}, { requireAuth: true })

const CreateBody = z.object({
  name: z.string().trim().min(2).max(200),
})

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])
  const body = await req.json()
  const parsed = CreateBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const c = await ensureClientByName({ organizationId: auth.org.id, name: parsed.data.name })
  const row = await db.query.clients.findFirst({
    where: and(eq(clients.organizationId, auth.org.id), eq(clients.id, c.id)),
    columns: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
  })
  return apiSuccess({ client: row ?? c })
}, { requireAuth: true })

