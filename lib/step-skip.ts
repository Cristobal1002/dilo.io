/**
 * Saltos condicionales en pasos (JSON en `steps.conditions`).
 * Regla: si `answers[variable if]` === `equals`, este paso se omite y se salta al paso con `order === skip_to`.
 * Puede ser un objeto único o un array de reglas (cualquier coincidencia omite el paso).
 */
import type { PublicFlowStep } from '@/lib/load-published-flow'
import { selectStoredPrimaryValue } from '@/lib/step-choice-helpers'

export type StepSkipRule = { if: string; equals: string; skip_to: number }

function isRule(x: unknown): x is StepSkipRule {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.if === 'string' &&
    typeof o.equals === 'string' &&
    typeof o.skip_to === 'number' &&
    Number.isFinite(o.skip_to)
  )
}

export function normalizeStepSkipRules(raw: unknown): StepSkipRule[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.filter(isRule)
  if (isRule(raw)) return [raw]
  return []
}

function answerForVariable(
  steps: PublicFlowStep[],
  variableName: string,
  answers: Record<string, string>,
): string {
  const ref = steps.find((s) => s.variableName === variableName)
  if (!ref) return ''
  const raw = answers[ref.id] ?? ''
  if (ref.type === 'select') return selectStoredPrimaryValue(raw)
  if (ref.type === 'yes_no') return raw.trim()
  if (ref.type === 'multi_select') {
    try {
      const p = JSON.parse(raw) as unknown
      if (Array.isArray(p)) return p.map(String).join(',')
    } catch {
      /* ignore */
    }
    return raw.trim()
  }
  return raw.trim()
}

/** El paso no se muestra ni exige respuesta si alguna regla aplica (respuesta previa coincide). */
export function isStepSkippedByRules(
  step: PublicFlowStep,
  answers: Record<string, string>,
  allSteps: PublicFlowStep[],
): boolean {
  const rules = normalizeStepSkipRules(step.conditions)
  for (const c of rules) {
    const val = answerForVariable(allSteps, c.if, answers)
    if (val === c.equals) return true
  }
  return false
}

/**
 * Siguiente índice en el array `steps` (ordenado por `order`) después de responder el paso `fromIdx`.
 */
export function nextStepIndexAfterAnswer(
  fromIdx: number,
  steps: PublicFlowStep[],
  answers: Record<string, string>,
): number {
  const maxHops = steps.length + 5
  let hops = 0
  let j = fromIdx + 1
  while (j < steps.length && hops < maxHops) {
    hops++
    const rules = normalizeStepSkipRules(steps[j].conditions)
    const matched = rules.find((c) => answerForVariable(steps, c.if, answers) === c.equals)
    if (matched) {
      const destIdx = steps.findIndex((s) => s.order === matched.skip_to)
      if (destIdx >= 0 && destIdx !== j) {
        j = destIdx
        continue
      }
    }
    break
  }
  if (j >= steps.length) return steps.length
  return j
}
