import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ClientPatchSchema } from '@/lib/client-api-schema'
import { clientToApi } from '@/lib/client-fields'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { deleteOrDeactivateClient, updateClientRecord } from '@/lib/support-clients'
import { withApiHandler } from '@/lib/with-api-handler'

const Params = z.object({ clientId: z.string().uuid() })

export const GET = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const parsed = Params.safeParse(params)
  if (!parsed.success) throw new NotFoundError('Cliente')

  const row = await db.query.clients.findFirst({
    where: and(eq(clients.organizationId, auth.org.id), eq(clients.id, parsed.data.clientId)),
  })
  if (!row) throw new NotFoundError('Cliente')
  return apiSuccess({ client: clientToApi(row) })
}, { requireAuth: true })

export const PATCH = withApiHandler(async (req: NextRequest, { auth, params }) => {
  requireOrgRoles(auth, ['owner', 'admin'])
  const parsedParams = Params.safeParse(params)
  if (!parsedParams.success) throw new NotFoundError('Cliente')

  const body = await req.json()
  const parsed = ClientPatchSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  try {
    const row = await updateClientRecord({
      organizationId: auth.org.id,
      clientId: parsedParams.data.clientId,
      input: parsed.data,
    })
    if (!row) throw new NotFoundError('Cliente')
    return apiSuccess({ client: clientToApi(row) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'DUPLICATE_EXTERNAL_ID') {
      throw new ValidationError('Ya existe un cliente con ese ID externo')
    }
    throw e
  }
}, { requireAuth: true })

export const DELETE = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  requireOrgRoles(auth, ['owner', 'admin'])
  const parsedParams = Params.safeParse(params)
  if (!parsedParams.success) throw new NotFoundError('Cliente')

  const result = await deleteOrDeactivateClient({
    organizationId: auth.org.id,
    clientId: parsedParams.data.clientId,
  })
  if (!result) throw new NotFoundError('Cliente')
  return apiSuccess({ result })
}, { requireAuth: true })
