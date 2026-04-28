import { normalizeStepSkipRules, type StepSkipRule } from '@/lib/step-skip'

/**
 * Valida reglas antes de guardar en API.
 * @returns mensaje de error en español o null si OK.
 */
export function validateStepConditionsInput(
  conditions: unknown,
  opts: {
    /** Órdenes (`steps.order`) existentes en el flow */
    stepOrders: number[]
    /** Variables definidas en otros pasos (y el actual, para excluir self en UI) */
    variableNames: Set<string>
    /** `variable_name` del paso que se está editando */
    currentVariableName: string
    /** `steps.order` del paso que se está editando */
    currentStepOrder: number
  },
): string | null {
  const rules = normalizeStepSkipRules(conditions)
  if (rules.length === 0) return null

  const orderSet = new Set(opts.stepOrders)
  for (const r of rules) {
    if (r.if === opts.currentVariableName) {
      return 'La regla no puede usar la variable de este mismo paso en "Si variable".'
    }
    if (!opts.variableNames.has(r.if)) {
      return `No existe ningún paso con la variable "${r.if}". Revisa el nombre exacto.`
    }
    if (!orderSet.has(r.skip_to)) {
      return `El orden destino ${r.skip_to} no coincide con ningún paso del flow. Usa el número de orden del paso destino.`
    }
    if (r.skip_to === opts.currentStepOrder) {
      return 'El destino no puede ser el mismo paso (mismo orden).'
    }
  }
  return null
}

export function normalizeConditionsForStore(conditions: StepSkipRule[] | null): unknown | null {
  if (!conditions || conditions.length === 0) return null
  if (conditions.length === 1) return conditions[0]
  return conditions
}
