import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { findDashboardFlow } from '@/lib/dashboard-flow-access'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import { processSessionCompletion } from '@/lib/session-completion'
import { apiSuccess } from '@/lib/api-response'
import { withApiHandler } from '@/lib/with-api-handler'

const log = createLogger('flows/recalculate-analysis')

export const POST = withApiHandler(
  async (_req: NextRequest, { auth, params }) => {
    const { flowId, sessionId } = params

    const access = await findDashboardFlow(flowId, auth.orgId)
    if (!access) throw new NotFoundError('Flow')

    const sessionRow = await db.query.sessions.findFirst({
      where: and(eq(sessions.id, sessionId), eq(sessions.flowId, flowId)),
    })
    if (!sessionRow) throw new NotFoundError('Sesión')
    if (sessionRow.status !== 'completed') {
      throw new ValidationError('Solo se puede recalcular el análisis en sesiones completadas.')
    }

    await processSessionCompletion(sessionId, { replaceExisting: true })

    log.info({ flowId, sessionId }, 'Session analysis recalculated from dashboard')

    return apiSuccess({ ok: true })
  },
  { requireAuth: true },
)
