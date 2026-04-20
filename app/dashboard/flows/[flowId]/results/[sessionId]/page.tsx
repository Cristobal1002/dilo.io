import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { and, asc, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/db'
import { answers, results, sessions, stepOptions, steps } from '@/db/schema'
import { findDashboardFlow } from '@/lib/dashboard-flow-access'
import { formatFlowAnswerDisplay } from '@/lib/format-flow-answer'

const classificationConfig = {
  hot: {
    label: 'Hot 🔥',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800/50',
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  warm: {
    label: 'Warm ⚡',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
    dot: 'bg-amber-400',
  },
  cold: {
    label: 'Cold ❄️',
    bg: 'bg-slate-50 dark:bg-slate-900/30',
    border: 'border-slate-200 dark:border-slate-700/50',
    badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
} as const

function formatDate(d: Date | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'short' }).format(d)
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ flowId: string; sessionId: string }>
}) {
  const { flowId, sessionId } = await params
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const access = await findDashboardFlow(flowId, orgId ?? userId)
  if (!access) notFound()

  const sessionRow = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.flowId, flowId)),
  })
  if (!sessionRow || sessionRow.status !== 'completed') notFound()

  const result = await db.query.results.findFirst({
    where: eq(results.sessionId, sessionId),
  })

  // Cargar steps con sus opciones
  const stepRows = await db.query.steps.findMany({
    where: eq(steps.flowId, flowId),
    orderBy: asc(steps.order),
  })
  const stepWithOptions = await Promise.all(
    stepRows.map(async (s) => {
      const opts = await db.query.stepOptions.findMany({
        where: eq(stepOptions.stepId, s.id),
        orderBy: asc(stepOptions.order),
      })
      return { ...s, options: opts.map((o) => ({ label: o.label, value: o.value })) }
    }),
  )

  // Cargar respuestas
  const answerRows = await db.query.answers.findMany({
    where: eq(answers.sessionId, sessionId),
  })
  const answerByStep: Record<string, string | null> = {}
  for (const a of answerRows) {
    answerByStep[a.stepId] = a.value ?? null
  }

  const cfg = result?.classification
    ? classificationConfig[result.classification as keyof typeof classificationConfig] ?? classificationConfig.cold
    : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">
            {access.flow.name}
          </p>
          <h1 className="mt-1 text-xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">
            Detalle de sesión
          </h1>
          <p className="mt-0.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Completada el {formatDate(sessionRow.completedAt)}
          </p>
        </div>
        <Link
          href={`/dashboard/flows/${flowId}/results`}
          className="shrink-0 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F9FAFB] dark:border-[#2A2F3F] dark:text-[#9CA3AF] dark:hover:bg-[#252936]"
        >
          ← Volver a resultados
        </Link>
      </div>

      {/* Scoring hero */}
      {result && cfg ? (
        <div className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${cfg.dot}`} aria-hidden />
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${cfg.badge}`}>
                {cfg.label}
              </span>
              {result.score != null && (
                <span className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">
                  Score: <span className="text-[#9C77F5]">{result.score}/100</span>
                </span>
              )}
            </div>
          </div>

          {result.summary && (
            <p className="mt-4 text-sm leading-relaxed text-[#374151] dark:text-[#D1D5DB]">
              {result.summary}
            </p>
          )}

          {result.suggestedAction && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#9C77F5]/8 px-4 py-3">
              <span className="mt-0.5 text-base" aria-hidden>💡</span>
              <p className="text-sm font-medium text-[#6B4DD4] dark:text-[#C4B5FD]">
                {result.suggestedAction}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] px-5 py-4 text-sm text-[#6B7280] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#94A3B8]">
          El resumen de IA aún no está disponible para esta sesión.
        </div>
      )}

      {/* Respuestas */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
          Respuestas del cliente
        </h2>
        <div className="flex flex-col gap-3">
          {stepWithOptions.map((step) => {
            const raw = answerByStep[step.id] ?? null
            const value = formatFlowAnswerDisplay(step.type, raw, step.options)
            return (
              <div
                key={step.id}
                className="rounded-xl border border-[#E8EAEF] bg-white px-4 py-3 dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
              >
                <p className="text-xs font-medium text-[#9CA3AF] dark:text-[#6B7280]">
                  {step.variableName}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                  {step.question}
                </p>
                <p className="mt-2 text-sm text-[#1A1A1A] dark:text-[#F8F9FB]">
                  {value}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
