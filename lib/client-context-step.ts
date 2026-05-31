import type { PublicFlowStep } from '@/lib/load-published-flow'

const COMPANY_VARIABLES = new Set([
  'empresa',
  'compania',
  'company',
  'client_company',
  'nombre_empresa',
  'organizacion',
  'cliente_empresa',
])

function normalizeVar(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Paso que pregunta la empresa del solicitante (omitible con contexto embed). */
export function isCompanyVariableStep(step: Pick<PublicFlowStep, 'variableName'>): boolean {
  return COMPANY_VARIABLES.has(normalizeVar(step.variableName))
}

export function isStepSkippedByEmbedClientContext(
  step: Pick<PublicFlowStep, 'variableName'>,
  embedClientId: string | null | undefined,
): boolean {
  return Boolean(embedClientId) && isCompanyVariableStep(step)
}
