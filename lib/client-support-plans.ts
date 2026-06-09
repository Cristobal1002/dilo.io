export const CLIENT_SUPPORT_PLAN_TIERS = ['essential', 'business', 'enterprise'] as const
export type ClientSupportPlanTier = (typeof CLIENT_SUPPORT_PLAN_TIERS)[number]

export type ClientSupportPlanMeta = {
  id: ClientSupportPlanTier
  label: string
  tagline: string
  businessHours: string
  responseSla: string
  channels: string
  coverage: string
}

export const CLIENT_SUPPORT_PLAN_META: Record<ClientSupportPlanTier, ClientSupportPlanMeta> = {
  essential: {
    id: 'essential',
    label: 'Essential',
    tagline: 'Soporte en horario laboral estándar',
    businessHours: 'Lun–Vie · 9:00 a 18:00',
    responseSla: 'Primera respuesta en 24 h hábiles',
    channels: 'Portal y correo',
    coverage: 'Incidencias y consultas operativas',
  },
  business: {
    id: 'business',
    label: 'Business',
    tagline: 'Cobertura extendida para equipos en crecimiento',
    businessHours: 'Lun–Sáb · 8:00 a 20:00',
    responseSla: 'Primera respuesta en 8 h hábiles',
    channels: 'Portal, correo y seguimiento prioritario',
    coverage: 'Soporte + mejoras planificadas',
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    tagline: 'Acompañamiento dedicado para operación crítica',
    businessHours: '24/7 · guardia para incidentes P1',
    responseSla: 'Primera respuesta en 2 h (P1) · 4 h (P2)',
    channels: 'Portal, correo, escalamiento directo',
    coverage: 'Soporte integral + roadmap compartido',
  },
}

export const CLIENT_SUPPORT_PLAN_LABEL: Record<ClientSupportPlanTier, string> = {
  essential: 'Essential',
  business: 'Business',
  enterprise: 'Enterprise',
}

export function isClientSupportPlanTier(value: string | null | undefined): value is ClientSupportPlanTier {
  return CLIENT_SUPPORT_PLAN_TIERS.includes(value as ClientSupportPlanTier)
}

export function resolveClientSupportPlanTier(value: string | null | undefined): ClientSupportPlanTier {
  return isClientSupportPlanTier(value) ? value : 'business'
}

export function clientSupportPlanForPortal(args: {
  tier: string | null | undefined
  hoursNote: string | null | undefined
}): ClientSupportPlanMeta & { hoursNote: string | null; businessHoursDisplay: string } {
  const meta = CLIENT_SUPPORT_PLAN_META[resolveClientSupportPlanTier(args.tier)]
  const hoursNote = args.hoursNote?.trim() || null
  return {
    ...meta,
    hoursNote,
    businessHoursDisplay: hoursNote ?? meta.businessHours,
  }
}
