import type { FlowGeneration, GeneratedStep } from '@/lib/schemas/flow-generation'

export const FLOW_TEMPLATE_IDS = [
  'pre-diagnostico-erp',
  'discovery-agencia',
  'calificacion-inmobiliaria',
  'onboarding-cliente',
  'pre-diagnostico-legal',
  'captura-datos-organizaciones',
  'evangelizacion-iglesias',
] as const

export type FlowTemplateId = (typeof FLOW_TEMPLATE_IDS)[number]

export type FlowTemplateDefinition = {
  id: FlowTemplateId
  title: string
  subtitle: string
  audience: string
  scoringObjective: string
} & FlowGeneration
