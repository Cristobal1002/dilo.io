import { NextRequest } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ClientBodySchema } from '@/lib/client-api-schema'
import { clientToApi } from '@/lib/client-fields'
import { ValidationError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { createClientRecord } from '@/lib/support-clients'
import { withApiHandler } from '@/lib/with-api-handler'

export const GET = withApiHandler(async (_req: NextRequest, { auth }) => {
  const rows = await db.query.clients.findMany({
    where: eq(clients.organizationId, auth.org.id),
    orderBy: [asc(clients.name)],
  })
  return apiSuccess({ clients: rows.map(clientToApi) })
}, { requireAuth: true })

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])
  const body = await req.json()
  const parsed = ClientBodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  try {
    const row = await createClientRecord({
      organizationId: auth.org.id,
      input: {
        ...parsed.data,
        taxIdType: parsed.data.taxIdType ?? undefined,
      },
    })
    return apiSuccess({ client: clientToApi(row) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'DUPLICATE_EXTERNAL_ID') {
      throw new ValidationError('Ya existe un cliente con ese ID externo')
    }
    throw e
  }
}, { requireAuth: true })
