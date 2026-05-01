'use client'

import { useEffect, useState } from 'react'
import { ChartBarIcon, BoltIcon, UsersIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { PLAN_LABELS, PLAN_COLORS, formatLimit, type Plan } from '@/lib/plan-limits'

type UsageData = {
  plan: Plan
  usage: {
    flows: { count: number; limit: number }
    sessionsThisMonth: { count: number; limit: number }
    members: { count: number; limit: number }
  }
}

function UsageBar({
  label,
  count,
  limit,
  icon: Icon,
}: {
  label: string
  count: number
  limit: number
  icon: React.ElementType
}) {
  const isUnlimited = limit === -1
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((count / limit) * 100))
  const isHigh = pct >= 85
  const isMed = pct >= 60

  return (
    <div className="py-4 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-[#F3F4F6] dark:[&+&]:border-[#252936]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3F4F6] dark:bg-[#252936]">
            <Icon className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
          </div>
          <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">{label}</span>
        </div>
        <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
          {count.toLocaleString('es')} / {formatLimit(limit)}
        </span>
      </div>
      {isUnlimited ? (
        <div className="h-1.5 w-full rounded-full bg-[#F3F4F6] dark:bg-[#252936] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
            style={{ width: '100%' }}
          />
        </div>
      ) : (
        <div className="h-1.5 w-full rounded-full bg-[#F3F4F6] dark:bg-[#252936] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isHigh
                ? 'bg-[#EF4444]'
                : isMed
                ? 'bg-[#F59E0B]'
                : 'bg-[#7C3AED]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {!isUnlimited && (
        <p className="mt-1 text-right text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">
          {isUnlimited ? '' : `${pct}% usado`}
          {isHigh && (
            <span className="ml-1 text-[#EF4444]">— casi al límite</span>
          )}
        </p>
      )}
    </div>
  )
}

const PLAN_FEATURES: Record<Plan, string[]> = {
  free: ['1 flow activo', '50 respuestas / mes', '1 miembro', 'Webhooks básicos', 'Soporte por email'],
  pro: ['20 flows activos', '5.000 respuestas / mes', '5 miembros', 'Webhooks + n8n', 'Resumen IA por respuesta', 'Soporte prioritario'],
  agency: ['Flows ilimitados', 'Respuestas ilimitadas', 'Miembros ilimitados', 'Todo de Pro', 'Onboarding personalizado', 'SLA de respuesta'],
}

function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${PLAN_COLORS[plan]}`}>
      {PLAN_LABELS[plan]}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] dark:border-[#2A2F3F] bg-white dark:bg-[#1A1D29] p-6 animate-pulse">
      <div className="h-4 w-24 rounded bg-[#F3F4F6] dark:bg-[#252936] mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded bg-[#F3F4F6] dark:bg-[#252936]" />
        ))}
      </div>
    </div>
  )
}

export default function PlanPage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings/usage')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data)
        else setError('No se pudo cargar la información de uso.')
      })
      .catch(() => setError('No se pudo cargar la información de uso.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-2xl space-y-5">
        <div className="h-7 w-36 rounded-lg bg-[#F3F4F6] dark:bg-[#252936] animate-pulse" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-[#EF4444]">{error || 'Error inesperado.'}</p>
      </div>
    )
  }

  const { plan, usage } = data
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">Plan & Uso</h1>
        <p className="mt-0.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Tu plan actual y consumo del mes.
        </p>
      </div>

      {/* Current plan */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] mb-2">
              Plan activo
            </p>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">
                {PLAN_LABELS[plan]}
              </span>
              <PlanBadge plan={plan} />
            </div>
          </div>
          {plan === 'free' && (
            <a
              href="mailto:hola@modecaitech.com?subject=Quiero actualizar mi plan"
              className="flex items-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-medium text-white hover:bg-[#6D28D9] transition-colors shrink-0"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              Mejorar plan
            </a>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-[#F3F4F6] dark:border-[#252936]">
          <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-3">Incluye</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-[#374151] dark:text-[#D1D5DB]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED] shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Usage */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29] p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] mb-4">
          Uso actual
        </p>
        <UsageBar
          label="Flows activos"
          count={usage.flows.count}
          limit={usage.flows.limit}
          icon={ChartBarIcon}
        />
        <UsageBar
          label="Respuestas este mes"
          count={usage.sessionsThisMonth.count}
          limit={usage.sessionsThisMonth.limit}
          icon={BoltIcon}
        />
        <UsageBar
          label="Miembros del equipo"
          count={usage.members.count}
          limit={usage.members.limit}
          icon={UsersIcon}
        />
      </div>

      {plan === 'free' && (
        <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          ¿Necesitas más? Escríbenos a{' '}
          <a href="mailto:hola@modecaitech.com" className="text-[#7C3AED] hover:underline">
            hola@modecaitech.com
          </a>{' '}
          y te armamos un plan a tu medida.
        </p>
      )}
    </div>
  )
}
