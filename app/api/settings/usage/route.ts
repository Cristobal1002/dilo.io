import { NextRequest } from 'next/server'
import { eq, count, and, gte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { flows, sessions, users, plans } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'
import { PLAN_LIMITS } from '@/lib/plan-limits'
import { createLogger } from '@/lib/logger'

const log = createLogger('settings/usage')

export const GET = withApiHandler(
  async (_req: NextRequest, { auth }) => {
    const { org } = auth

    // ── 1. Load plan limits from DB (fallback to hardcoded config) ───────────
    const planRow = await db.query.plans.findFirst({
      where: eq(plans.id, org.plan),
      columns: {
        flowsLimit: true,
        sessionsMonthLimit: true,
        membersLimit: true,
      },
    })

    // If plan row not seeded yet, fall back to the TypeScript config
    const fallback = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free
    const limits = planRow ?? {
      flowsLimit: fallback.flows,
      sessionsMonthLimit: fallback.sessionsPerMonth,
      membersLimit: fallback.members,
    }

    // ── 2. Count flows for this org ───────────────────────────────────────────
    const [flowsResult] = await db
      .select({ count: count() })
      .from(flows)
      .where(eq(flows.organizationId, org.id))

    // ── 3. Count sessions this calendar month ────────────────────────────────
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const orgFlowIds = await db
      .select({ id: flows.id })
      .from(flows)
      .where(eq(flows.organizationId, org.id))

    let sessionsCount = 0
    if (orgFlowIds.length > 0) {
      const ids = orgFlowIds.map((f) => f.id)
      const [sessResult] = await db
        .select({ count: count() })
        .from(sessions)
        .where(
          and(
            sql`${sessions.flowId} = ANY(ARRAY[${sql.join(
              ids.map((id) => sql`${id}::uuid`),
              sql`, `,
            )}])`,
            gte(sessions.startedAt, monthStart),
          ),
        )
      sessionsCount = sessResult?.count ?? 0
    }

    // ── 4. Count members ─────────────────────────────────────────────────────
    const [membersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, org.id))

    log.debug(
      { orgId: org.id, plan: org.plan, flows: flowsResult?.count, sessions: sessionsCount },
      'Usage fetched',
    )

    return apiSuccess({
      plan: org.plan,
      planMeta: {
        startedAt: org.planStartedAt ?? null,
        trialEndsAt: org.trialEndsAt ?? null,
      },
      usage: {
        flows: {
          count: flowsResult?.count ?? 0,
          limit: limits.flowsLimit,
        },
        sessionsThisMonth: {
          count: sessionsCount,
          limit: limits.sessionsMonthLimit,
        },
        members: {
          count: membersResult?.count ?? 0,
          limit: limits.membersLimit,
        },
      },
    })
  },
  { requireAuth: true },
)
