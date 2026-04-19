import { randomBytes } from 'node:crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiCreated } from '@/lib/api-response'
import { NotFoundError } from '@/lib/errors'
import { loadPublishedFlowWithSteps } from '@/lib/load-published-flow'

const flowIdSchema = z.string().uuid()

/**
 * Crea una sesión pública (token opaco) para responder un flow publicado.
 */
export const POST = withApiHandler(
  async (_req: NextRequest, { params }) => {
    const { flowId } = params
    if (!flowIdSchema.safeParse(flowId).success) {
      throw new NotFoundError('Flow')
    }
    await loadPublishedFlowWithSteps(flowId)

    const token = randomBytes(32).toString('hex')
    const [row] = await db
      .insert(sessions)
      .values({
        flowId,
        token,
        status: 'in_progress',
        metadata: { currentStepIndex: 0 },
      })
      .returning({ id: sessions.id, token: sessions.token, status: sessions.status })

    if (!row) throw new NotFoundError('Flow')

    return apiCreated({
      session: { id: row.id, token: row.token, status: row.status },
    })
  },
  { requireAuth: false },
)
