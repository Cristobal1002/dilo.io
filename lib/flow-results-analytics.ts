import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { answers, sessions, stepOptions, steps } from '@/db/schema'

const MS_DAY = 86_400_000

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function lastNDaysUtc(n: number): Date[] {
  const out: Date[] = []
  const today = startOfUtcDay(new Date())
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(today.getTime() - i * MS_DAY))
  }
  return out
}

export type QuestionOptionStat = {
  label: string
  value: string
  count: number
  pct: number
}

export type QuestionSummary = {
  stepId: string
  order: number
  question: string
  type: string
  completedTotal: number
  answeredCount: number
  /** Barras por opción; vacío si mostramos solo barra única de “respondieron”. */
  options: QuestionOptionStat[]
}

export type FlowResultsAnalytics = {
  hasAnySessions: boolean
  visits30d: number
  partial30d: number
  completed30d: number
  visitsSparkline: number[]
  partialSparkline: number[]
  completedSparkline: number[]
  conversionPct: number
  completionPct: number
  avgDurationMs: number | null
  avgAnswersPerSession: number | null
  avgScore: number | null
  abandonmentPct: number
  questionSummaries: QuestionSummary[]
}

function isAnswered(value: string | null): boolean {
  if (value == null) return false
  const t = value.trim()
  if (!t) return false
  if (t === '{}' || t === '[]') return false
  try {
    const p = JSON.parse(t) as unknown
    if (Array.isArray(p) && p.length === 0) return false
    if (typeof p === 'object' && p !== null && 'skipped' in (p as { skipped?: boolean }) && (p as { skipped: boolean }).skipped)
      return false
  } catch {
    /* texto libre */
  }
  return true
}

function parseMultiValues(value: string): string[] {
  try {
    const p = JSON.parse(value) as unknown
    if (Array.isArray(p)) return p.map(String)
  } catch {
    /* ignore */
  }
  return []
}

export async function getFlowResultsAnalytics(
  flowId: string,
  opts: { avgScoreFromResults: number | null },
): Promise<FlowResultsAnalytics> {
  const now = new Date()
  const from30 = new Date(now.getTime() - 30 * MS_DAY)

  const sessionRows = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      startedAt: sessions.startedAt,
      completedAt: sessions.completedAt,
    })
    .from(sessions)
    .where(eq(sessions.flowId, flowId))

  const total = sessionRows.length
  const completedSessions = sessionRows.filter((s) => s.status === 'completed')
  const completedTotal = completedSessions.length
  const partialTotal = sessionRows.filter((s) => s.status !== 'completed').length

  const in30 = (d: Date) => d.getTime() >= from30.getTime()
  const visits30d = sessionRows.filter((s) => in30(s.startedAt)).length
  const completed30d = completedSessions.filter((s) => s.completedAt && in30(s.completedAt)).length
  const partial30d = sessionRows.filter(
    (s) => s.status !== 'completed' && in30(s.startedAt),
  ).length

  const dayBuckets = lastNDaysUtc(7)
  const visitsSparkline = dayBuckets.map((day) => {
    const k = dayKey(day)
    return sessionRows.filter((s) => dayKey(startOfUtcDay(s.startedAt)) === k).length
  })
  const completedSparkline = dayBuckets.map((day) => {
    const k = dayKey(day)
    return completedSessions.filter((s) => s.completedAt && dayKey(startOfUtcDay(s.completedAt)) === k).length
  })
  const partialSparkline = dayBuckets.map((_, i) => Math.max(0, visitsSparkline[i]! - completedSparkline[i]!))

  const conversionPct = total ? Math.round((completedTotal / total) * 10_000) / 100 : 0
  const funnelDen = completedTotal + partialTotal
  const completionPct = funnelDen ? Math.round((completedTotal / funnelDen) * 10_000) / 100 : 0
  const abandonmentPct = total ? Math.round((partialTotal / total) * 10_000) / 100 : 0

  let sumMs = 0
  let nDur = 0
  for (const s of completedSessions) {
    if (s.completedAt) {
      const d = s.completedAt.getTime() - s.startedAt.getTime()
      if (d > 0) {
        sumMs += d
        nDur += 1
      }
    }
  }
  const avgDurationMs = nDur ? sumMs / nDur : null

  const completedIds = completedSessions.map((s) => s.id)
  let avgAnswersPerSession: number | null = null
  const answerRows =
    completedIds.length === 0
      ? []
      : await db
          .select({ sessionId: answers.sessionId, stepId: answers.stepId, value: answers.value })
          .from(answers)
          .where(inArray(answers.sessionId, completedIds))

  if (completedIds.length > 0) {
    const perSession = new Map<string, number>()
    for (const id of completedIds) perSession.set(id, 0)
    for (const a of answerRows) {
      if (!isAnswered(a.value)) continue
      perSession.set(a.sessionId, (perSession.get(a.sessionId) ?? 0) + 1)
    }
    const counts = [...perSession.values()]
    const sumA = counts.reduce((a, b) => a + b, 0)
    avgAnswersPerSession = counts.length ? Math.round((sumA / counts.length) * 10) / 10 : null
  }

  const stepRows = await db.query.steps.findMany({
    where: eq(steps.flowId, flowId),
    orderBy: asc(steps.order),
  })

  const optionsByStep = new Map<string, { label: string; value: string }[]>()
  for (const st of stepRows) {
    const opts = await db.query.stepOptions.findMany({
      where: eq(stepOptions.stepId, st.id),
      orderBy: asc(stepOptions.order),
    })
    optionsByStep.set(
      st.id,
      opts.map((o) => ({ label: o.label, value: o.value })),
    )
  }

  const answersByStep = new Map<string, { sessionId: string; value: string | null }[]>()
  for (const st of stepRows) {
    answersByStep.set(st.id, [])
  }
  for (const a of answerRows) {
    const list = answersByStep.get(a.stepId)
    if (list) list.push({ sessionId: a.sessionId, value: a.value })
  }

  const questionSummaries: QuestionSummary[] = []

  for (const st of stepRows) {
    const list = answersByStep.get(st.id) ?? []
    const answeredSessionIds = new Set<string>()
    const valueCounts = new Map<string, number>()

    for (const row of list) {
      if (!isAnswered(row.value)) continue
      answeredSessionIds.add(row.sessionId)

      if (st.type === 'multi_select' && row.value) {
        for (const v of parseMultiValues(row.value)) {
          valueCounts.set(v, (valueCounts.get(v) ?? 0) + 1)
        }
        continue
      }

      const key = (row.value ?? '').trim()
      valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1)
    }

    const answeredCount = answeredSessionIds.size
    const denom = completedTotal || 1
    const opts = optionsByStep.get(st.id) ?? []

    let optionStats: QuestionOptionStat[] = []

    if (st.type === 'select' || st.type === 'yes_no' || st.type === 'rating') {
      if (st.type === 'yes_no') {
        const labels: Record<string, string> = { yes: 'Sí', no: 'No' }
        const keys = ['yes', 'no']
        for (const k of keys) {
          const c = valueCounts.get(k) ?? 0
          optionStats.push({
            label: labels[k] ?? k,
            value: k,
            count: c,
            pct: denom ? Math.round((c / denom) * 1000) / 10 : 0,
          })
        }
      } else if (opts.length > 0) {
        for (const o of opts) {
          const c = valueCounts.get(o.value) ?? 0
          optionStats.push({
            label: o.label,
            value: o.value,
            count: c,
            pct: denom ? Math.round((c / denom) * 1000) / 10 : 0,
          })
        }
      } else {
        const distinct = [...valueCounts.entries()].sort((a, b) => b[1] - a[1])
        for (const [val, c] of distinct) {
          optionStats.push({
            label: val.length > 48 ? `${val.slice(0, 45)}…` : val,
            value: val,
            count: c,
            pct: denom ? Math.round((c / denom) * 1000) / 10 : 0,
          })
        }
      }
    } else if (st.type === 'multi_select' && opts.length > 0) {
      for (const o of opts) {
        const c = valueCounts.get(o.value) ?? 0
        optionStats.push({
          label: o.label,
          value: o.value,
          count: c,
          pct: denom ? Math.round((c / denom) * 1000) / 10 : 0,
        })
      }
    } else {
      const pct = denom ? Math.round((answeredCount / denom) * 1000) / 10 : 0
      optionStats = [
        {
          label: 'Respondieron',
          value: '_answered',
          count: answeredCount,
          pct,
        },
      ]
    }

    questionSummaries.push({
      stepId: st.id,
      order: st.order,
      question: st.question,
      type: st.type,
      completedTotal,
      answeredCount,
      options: optionStats,
    })
  }

  return {
    hasAnySessions: total > 0,
    visits30d,
    partial30d,
    completed30d,
    visitsSparkline,
    partialSparkline,
    completedSparkline,
    conversionPct,
    completionPct,
    avgDurationMs,
    avgAnswersPerSession,
    avgScore: opts.avgScoreFromResults,
    abandonmentPct,
    questionSummaries,
  }
}
