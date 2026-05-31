'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChartBarIcon, BoltIcon, UsersIcon, SparklesIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { PLAN_LABELS, PLAN_COLORS, formatLimit, type Plan } from '@/lib/plan-limits'

type UsageData = {
  plan: Plan
  billing?: {
    stripeConfigured: boolean
    hasStripeCustomer: boolean
    hasActiveSubscription: boolean
  }
  usage: {
    flows: { count: number; limit: number }
    sessionsThisMonth: { count: number; limit: number }
    members: { count: number; limit: number }
  }
}

const UPGRADE_PLANS: { id: Exclude<Plan, 'free'>; label: string; price: string }[] = [
  { id: 'pro', label: 'Pro', price: '$29/mes' },
  { id: 'agency', label: 'Agency', price: '$99/mes' },
]

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
            className="h-full rounded-full bg-linear-to-r from-[#7C3AED] to-[#06B6D4]"
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

async function startCheckout(planId: Exclude<Plan, 'free'>): Promise<string> {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId }),
  })
  const json = await res.json()
  if (!json.success || !json.data?.url) {
    throw new Error(json.error?.message ?? 'No se pudo iniciar el checkout')
  }
  return json.data.url as string
}

async function openPortal(): Promise<string> {
  const res = await fetch('/api/billing/portal', { method: 'POST' })
  const json = await res.json()
  if (!json.success || !json.data?.url) {
    throw new Error(json.error?.message ?? 'No se pudo abrir el portal de facturación')
  }
  return json.data.url as string
}

export default function PlanPageClient() {
  const searchParams = useSearchParams()
  const checkoutStatus = searchParams.get('checkout')

  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [billingAction, setBillingAction] = useState<string | null>(null)
  const [billingError, setBillingError] = useState('')

  const loadUsage = useCallback(() => {
    return fetch('/api/settings/usage')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data)
        else setError('No se pudo cargar la información de uso.')
      })
      .catch(() => setError('No se pudo cargar la información de uso.'))
  }, [])

  useEffect(() => {
    loadUsage().finally(() => setLoading(false))
  }, [loadUsage])

  useEffect(() => {
    if (checkoutStatus === 'success') {
      loadUsage()
    }
  }, [checkoutStatus, loadUsage])

  const handleCheckout = async (planId: Exclude<Plan, 'free'>) => {
    setBillingError('')
    setBillingAction(planId)
    try {
      const url = await startCheckout(planId)
      window.location.href = url
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Error al iniciar checkout')
      setBillingAction(null)
    }
  }

  const handlePortal = async () => {
    setBillingError('')
    setBillingAction('portal')
    try {
      const url = await openPortal()
      window.location.href = url
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Error al abrir el portal')
      setBillingAction(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-36 rounded-lg bg-[#F3F4F6] dark:bg-[#252936] animate-pulse" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <p className="text-sm text-[#EF4444]">{error || 'Error inesperado.'}</p>
      </div>
    )
  }

  const { plan, usage, billing } = data
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free
  const stripeReady = billing?.stripeConfigured ?? false
  const canManageSubscription = billing?.hasStripeCustomer ?? false
  const showUpgrade = plan === 'free' && stripeReady
  const showPortal = canManageSubscription && stripeReady

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">Plan & Uso</h1>
        <p className="mt-0.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Tu plan actual y consumo del mes.
        </p>
      </div>

      {checkoutStatus === 'success' && (
        <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-sm text-[#065F46] dark:border-[#065F46]/40 dark:bg-[#064E3B]/20 dark:text-[#A7F3D0]">
          Pago recibido. Tu plan se actualizará en unos segundos cuando Stripe confirme la suscripción.
        </div>
      )}

      {checkoutStatus === 'cancel' && (
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E] dark:border-[#92400E]/40 dark:bg-[#78350F]/20 dark:text-[#FDE68A]">
          Checkout cancelado. Puedes intentarlo de nuevo cuando quieras.
        </div>
      )}

      {billingError && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B] dark:border-[#991B1B]/40 dark:bg-[#7F1D1D]/20 dark:text-[#FECACA]">
          {billingError}
        </div>
      )}

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

          {showPortal && (
            <button
              type="button"
              onClick={handlePortal}
              disabled={billingAction !== null}
              className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors shrink-0 disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#D1D5DB] dark:hover:bg-[#252936]"
            >
              <CreditCardIcon className="h-3.5 w-3.5" />
              {billingAction === 'portal' ? 'Abriendo…' : 'Gestionar suscripción'}
            </button>
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

      {showUpgrade && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29] p-6">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="h-4 w-4 text-[#7C3AED]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280]">
              Mejorar plan
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {UPGRADE_PLANS.map(({ id, label, price }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleCheckout(id)}
                disabled={billingAction !== null}
                className="flex flex-col items-start rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-4 text-left transition-colors hover:border-[#7C3AED]/40 hover:bg-[#F5F3FF] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#252936] dark:hover:border-[#7C3AED]/40 dark:hover:bg-[#2A2540]"
              >
                <span className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">{label}</span>
                <span className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{price}</span>
                <span className="mt-3 text-xs font-medium text-[#7C3AED]">
                  {billingAction === id ? 'Redirigiendo…' : 'Suscribirse →'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {!stripeReady && plan === 'free' && (
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
