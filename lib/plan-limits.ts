/**
 * lib/plan-limits.ts
 * Tipos y fallback estático de planes de Dilo.
 *
 * La FUENTE DE VERDAD en runtime es la tabla `plans` en la BD,
 * poblada con db/seed-plans.ts.
 *
 * Este archivo se usa como:
 *  - Tipos TypeScript (Plan, PlanLimits)
 *  - Fallback cuando el seed aún no se ha corrido
 *  - Helpers de UI (labels, colores)
 */

export type Plan = 'free' | 'pro' | 'agency'

export type PlanLimits = {
  flows: number           // -1 = ilimitado
  sessionsPerMonth: number
  members: number
}

/** Fallback estático — usar solo si la BD no tiene el plan. */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:   { flows: 1,  sessionsPerMonth: 50,     members: 1  },
  pro:    { flows: 20, sessionsPerMonth: 5_000,  members: 5  },
  agency: { flows: -1, sessionsPerMonth: -1,     members: -1 },
}

export const PLAN_LABELS: Record<Plan, string> = {
  free:   'Free',
  pro:    'Pro',
  agency: 'Agency',
}

export const PLAN_COLORS: Record<Plan, string> = {
  free:   'text-[#6B7280] bg-[#F3F4F6] dark:bg-[#252936] dark:text-[#9CA3AF]',
  pro:    'text-[#7C3AED] bg-[#EDE9FE] dark:bg-[#2D1F6E] dark:text-[#C4B5FD]',
  agency: 'text-[#0891B2] bg-[#ECFEFF] dark:bg-[#0C2637] dark:text-[#67E8F9]',
}

export function isPlan(value: unknown): value is Plan {
  return value === 'free' || value === 'pro' || value === 'agency'
}

/** -1 → 'Ilimitado', cualquier otro número formateado con separador de miles. */
export function formatLimit(n: number): string {
  return n === -1 ? 'Ilimitado' : n.toLocaleString('es')
}
