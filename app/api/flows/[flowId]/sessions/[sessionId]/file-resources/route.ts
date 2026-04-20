import { NextRequest } from 'next/server'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { answers, sessions, steps } from '@/db/schema'
import { findDashboardFlow } from '@/lib/dashboard-flow-access'
import { NotFoundError } from '@/lib/errors'
import { buildFileResourceGroupsFromRaw } from '@/lib/flow-results-file-resources'
import { apiSuccess } from '@/lib/api-response'
import { withApiHandler } from '@/lib/with-api-handler'

export const GET = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const { flowId, sessionId } = params

  const access = await findDashboardFlow(flowId, auth.orgId)
  if (!access) throw new NotFoundError('Flow')

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.flowId, flowId)),
  })
  if (!session) throw new NotFoundError('Sesión')

  const fileSteps = await db.query.steps.findMany({
    where: and(eq(steps.flowId, flowId), eq(steps.type, 'file')),
    orderBy: asc(steps.order),
  })

  const stepIds = fileSteps.map((s) => s.id)
  if (stepIds.length === 0) {
    return apiSuccess({ groups: [] })
  }

  const answerRows = await db
    .select({ stepId: answers.stepId, value: answers.value })
    .from(answers)
    .where(and(eq(answers.sessionId, sessionId), inArray(answers.stepId, stepIds)))

  const byStep = new Map(answerRows.map((a) => [a.stepId, a.value ?? null]))

  const groups = []
  for (const s of fileSteps) {
    const raw = byStep.get(s.id) ?? null
    const g = buildFileResourceGroupsFromRaw(s.question, raw)
    if (g) groups.push(g)
  }

  return apiSuccess({ groups })
})
