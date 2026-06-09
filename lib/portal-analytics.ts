import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { clients, supportCases } from '@/db/schema'
import {
  clientSupportPlanForPortal,
  resolveClientSupportPlanTier,
} from '@/lib/client-support-plans'
import { SUPPORT_STATUS_LABEL, type SupportPriority, type SupportStatus } from '@/lib/support'

const OPEN_STATUSES: SupportStatus[] = ['new', 'in_progress', 'waiting']
const RESOLVED_STATUSES: SupportStatus[] = ['resolved', 'closed']

export type PortalMonthlyBucket = {
  month: string
  label: string
  created: number
  resolved: number
  hours: number
}

export type PortalDashboardStats = {
  contract: ReturnType<typeof clientSupportPlanForPortal>
  kpis: {
    open: number
    resolvedLast30: number
    hoursThisMonth: number
    hoursLastMonth: number
    hoursDeltaPct: number | null
    onTimePct: number | null
    avgResolutionDays: number | null
  }
  byStatus: { status: SupportStatus; label: string; count: number }[]
  byPriority: { priority: SupportPriority; count: number }[]
  monthly: PortalMonthlyBucket[]
  compare: {
    thisMonth: { created: number; resolved: number; openEnd: number }
    lastMonth: { created: number; resolved: number; openEnd: number }
  }
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' }).format(
    new Date(Date.UTC(y!, m! - 1, 1)),
  )
}

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function addMonthsUtc(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1))
}

export async function loadPortalDashboardStats(args: {
  organizationId: string
  clientId: string
}): Promise<PortalDashboardStats> {
  let client: { supportPlanTier: string | null; supportHoursNote: string | null } | undefined
  try {
    client = await db.query.clients.findFirst({
      where: and(eq(clients.id, args.clientId), eq(clients.organizationId, args.organizationId)),
      columns: { supportPlanTier: true, supportHoursNote: true },
    })
  } catch {
    client = undefined
  }

  const contract = clientSupportPlanForPortal({
    tier: client?.supportPlanTier ?? resolveClientSupportPlanTier(null),
    hoursNote: client?.supportHoursNote ?? null,
  })

  const base = and(
    eq(supportCases.organizationId, args.organizationId),
    eq(supportCases.clientId, args.clientId),
  )

  const statusRows = await db
    .select({
      status: supportCases.status,
      count: sql<number>`count(*)::int`,
    })
    .from(supportCases)
    .where(base)
    .groupBy(supportCases.status)

  const priorityRows = await db
    .select({
      priority: supportCases.priority,
      count: sql<number>`count(*)::int`,
    })
    .from(supportCases)
    .where(base)
    .groupBy(supportCases.priority)

  const now = new Date()
  const thisMonthStart = startOfMonthUtc(now)
  const lastMonthStart = addMonthsUtc(thisMonthStart, -1)
  const sixMonthsStart = addMonthsUtc(thisMonthStart, -5)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [openRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportCases)
    .where(and(base, inArray(supportCases.status, OPEN_STATUSES)))

  const [resolved30Row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportCases)
    .where(
      and(
        base,
        inArray(supportCases.status, RESOLVED_STATUSES),
        gte(supportCases.resolvedAt, thirtyDaysAgo),
      ),
    )

  const hoursRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${supportCases.createdAt}), 'YYYY-MM')`,
      hours: sql<number>`coalesce(sum(${supportCases.hoursSpent}), 0)::float`,
    })
    .from(supportCases)
    .where(and(base, gte(supportCases.createdAt, lastMonthStart)))
    .groupBy(sql`date_trunc('month', ${supportCases.createdAt})`)

  const thisMonthKey = monthKey(thisMonthStart)
  const lastMonthKey = monthKey(lastMonthStart)
  const hoursThisMonth = hoursRows.find((r) => r.month === thisMonthKey)?.hours ?? 0
  const hoursLastMonth = hoursRows.find((r) => r.month === lastMonthKey)?.hours ?? 0
  const hoursDeltaPct =
    hoursLastMonth > 0
      ? Math.round(((hoursThisMonth - hoursLastMonth) / hoursLastMonth) * 100)
      : hoursThisMonth > 0
        ? 100
        : null

  const monthlyActivity = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${supportCases.createdAt}), 'YYYY-MM')`,
      created: sql<number>`count(*)::int`,
      resolved: sql<number>`count(*) filter (where ${supportCases.status} in ('resolved', 'closed'))::int`,
      hours: sql<number>`coalesce(sum(${supportCases.hoursSpent}), 0)::float`,
    })
    .from(supportCases)
    .where(and(base, gte(supportCases.createdAt, sixMonthsStart)))
    .groupBy(sql`date_trunc('month', ${supportCases.createdAt})`)
    .orderBy(sql`date_trunc('month', ${supportCases.createdAt})`)

  const monthly: PortalMonthlyBucket[] = []
  for (let i = 0; i < 6; i++) {
    const d = addMonthsUtc(sixMonthsStart, i)
    const key = monthKey(d)
    const row = monthlyActivity.find((r) => r.month === key)
    monthly.push({
      month: key,
      label: monthLabel(key),
      created: row?.created ?? 0,
      resolved: row?.resolved ?? 0,
      hours: Math.round((row?.hours ?? 0) * 10) / 10,
    })
  }

  const [thisMonthStats] = await db
    .select({
      created: sql<number>`count(*)::int`,
      resolved: sql<number>`count(*) filter (where ${supportCases.status} in ('resolved', 'closed'))::int`,
    })
    .from(supportCases)
    .where(and(base, gte(supportCases.createdAt, thisMonthStart)))

  const [lastMonthStats] = await db
    .select({
      created: sql<number>`count(*)::int`,
      resolved: sql<number>`count(*) filter (where ${supportCases.status} in ('resolved', 'closed'))::int`,
    })
    .from(supportCases)
    .where(
      and(
        base,
        gte(supportCases.createdAt, lastMonthStart),
        sql`${supportCases.createdAt} < ${thisMonthStart}`,
      ),
    )

  const [openThisMonthEnd] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportCases)
    .where(
      and(
        base,
        inArray(supportCases.status, OPEN_STATUSES),
        sql`${supportCases.createdAt} <= ${now}`,
      ),
    )

  const slaRow = await db
    .select({
      total: sql<number>`count(*)::int`,
      onTime: sql<number>`count(*) filter (where ${supportCases.resolvedAt} is not null and ${supportCases.dueAt} is not null and ${supportCases.resolvedAt} <= ${supportCases.dueAt})::int`,
    })
    .from(supportCases)
    .where(
      and(
        base,
        inArray(supportCases.status, RESOLVED_STATUSES),
        sql`${supportCases.dueAt} is not null`,
        sql`${supportCases.resolvedAt} is not null`,
      ),
    )

  const avgRow = await db
    .select({
      avgDays: sql<number>`avg(extract(epoch from (${supportCases.resolvedAt} - ${supportCases.createdAt})) / 86400)::float`,
    })
    .from(supportCases)
    .where(
      and(
        base,
        inArray(supportCases.status, RESOLVED_STATUSES),
        sql`${supportCases.resolvedAt} is not null`,
      ),
    )

  const onTimePct =
    slaRow[0]?.total && slaRow[0].total > 0
      ? Math.round((slaRow[0].onTime / slaRow[0].total) * 100)
      : null

  const avgResolutionDays =
    avgRow[0]?.avgDays != null ? Math.round(avgRow[0].avgDays * 10) / 10 : null

  return {
    contract,
    kpis: {
      open: openRow?.count ?? 0,
      resolvedLast30: resolved30Row?.count ?? 0,
      hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
      hoursLastMonth: Math.round(hoursLastMonth * 10) / 10,
      hoursDeltaPct,
      onTimePct,
      avgResolutionDays,
    },
    byStatus: statusRows.map((r) => ({
      status: r.status as SupportStatus,
      label: SUPPORT_STATUS_LABEL[r.status as SupportStatus] ?? r.status,
      count: r.count,
    })),
    byPriority: priorityRows.map((r) => ({
      priority: r.priority as SupportPriority,
      count: r.count,
    })),
    monthly,
    compare: {
      thisMonth: {
        created: thisMonthStats?.created ?? 0,
        resolved: thisMonthStats?.resolved ?? 0,
        openEnd: openThisMonthEnd?.count ?? 0,
      },
      lastMonth: {
        created: lastMonthStats?.created ?? 0,
        resolved: lastMonthStats?.resolved ?? 0,
        openEnd: 0,
      },
    },
  }
}
