import { agenciaTemplate } from './agencia'
import { erpTemplate } from './erp'
import { inmobiliariaTemplate } from './inmobiliaria'
import { legalTemplate } from './legal'
import { onboardingTemplate } from './onboarding'
import { organizacionesTemplate } from './organizaciones'
import type { FlowTemplateDefinition, FlowTemplateId } from './types'

export { TB } from './branch-presets'
export { FLOW_TEMPLATE_IDS, type FlowTemplateDefinition, type FlowTemplateId } from './types'

const FLOW_TEMPLATES_INTERNAL: FlowTemplateDefinition[] = [
  erpTemplate,
  agenciaTemplate,
  inmobiliariaTemplate,
  onboardingTemplate,
  legalTemplate,
  organizacionesTemplate,
]

const byId = new Map(FLOW_TEMPLATES_INTERNAL.map((t) => [t.id, t]))

export function getFlowTemplateById(id: string): FlowTemplateDefinition | undefined {
  return byId.get(id as FlowTemplateId)
}

export const FLOW_TEMPLATE_CARDS = FLOW_TEMPLATES_INTERNAL.map((t) => ({
  id: t.id,
  title: t.title,
  subtitle: t.subtitle,
  audience: t.audience,
  stepCount: t.steps.length,
}))
