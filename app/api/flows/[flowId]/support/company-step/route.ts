import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clients, flows, stepOptions, steps } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { backfillClientsFromSupportCases } from '@/lib/support-clients'
import { withApiHandler } from '@/lib/with-api-handler'

const Params = z.object({
  flowId: z.string().uuid(),
})

/**
 * Convierte el step `empresa` a select y lo llena con clients (value=clientId).
 * Si no hay clients, intenta crearlos desde casos existentes del workspace.
 */
export const POST = withApiHandler(async (req: NextRequest, { auth, params }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  const parsed = Params.safeParse(params)
  if (!parsed.success) {
    throw new ValidationError('Flow inválido')
  }
  const flowId = parsed.data.flowId

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, auth.org.id)),
    columns: { id: true },
  })
  if (!flow) throw new ValidationError('Flow no encontrado')

  const empresaStep = await db.query.steps.findFirst({
    where: and(eq(steps.flowId, flowId), eq(steps.variableName, 'empresa')),
    columns: { id: true, type: true },
  })
  if (!empresaStep) {
    throw new ValidationError('No encontré un paso con variable "empresa" en este flow')
  }

  let clientRows = await db.query.clients.findMany({
    where: eq(clients.organizationId, auth.org.id),
    columns: { id: true, name: true },
    orderBy: (t, { asc }) => [asc(t.name)],
  })

  if (clientRows.length === 0) {
    await backfillClientsFromSupportCases({ organizationId: auth.org.id })
    clientRows = await db.query.clients.findMany({
      where: eq(clients.organizationId, auth.org.id),
      columns: { id: true, name: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    })
  }

  if (clientRows.length === 0) {
    throw new ValidationError('Crea al menos 1 cliente (empresa) antes de actualizar el step')
  }

  if (empresaStep.type !== 'select') {
    await db.update(steps).set({ type: 'select' }).where(eq(steps.id, empresaStep.id))
  }

  await db.delete(stepOptions).where(eq(stepOptions.stepId, empresaStep.id))
  await db.insert(stepOptions).values(
    clientRows.map((c, i) => ({
      stepId: empresaStep.id,
      label: c.name,
      value: c.id,
      order: i + 1,
    })),
  )

  return apiSuccess({
    updated: true,
    clients: clientRows.length,
  })
}, { requireAuth: true })

