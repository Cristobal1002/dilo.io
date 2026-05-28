export const SUPPORT_STATUSES = ['new', 'in_progress', 'waiting', 'resolved', 'closed'] as const
export type SupportStatus = (typeof SUPPORT_STATUSES)[number]

export const SUPPORT_FILTER_STATUSES = ['all', ...SUPPORT_STATUSES] as const
export type SupportFilterStatus = (typeof SUPPORT_FILTER_STATUSES)[number]

export const SUPPORT_PRIORITIES = ['low', 'medium', 'high'] as const
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number]

export const SUPPORT_TYPES = ['support', 'improvement', 'inquiry', 'other'] as const
export type SupportCaseType = (typeof SUPPORT_TYPES)[number]

export const SUPPORT_ASSIGNEE_FILTERS = ['all', 'me', 'unassigned'] as const
export type SupportAssigneeFilter = (typeof SUPPORT_ASSIGNEE_FILTERS)[number]

/** Respuesta del solicitante (persona que pidió el caso). */
export const SUPPORT_CLIENT_APPROVAL_STATUSES = [
  'pending',
  'approved',
  'cancelled',
  'changes_requested',
] as const
export type SupportClientApprovalStatus = (typeof SUPPORT_CLIENT_APPROVAL_STATUSES)[number]

export const SUPPORT_CLIENT_APPROVAL_ACTIONS = [
  'approved',
  'cancelled',
  'changes_requested',
] as const
export type SupportClientApprovalAction = (typeof SUPPORT_CLIENT_APPROVAL_ACTIONS)[number]

export function isSupportClientApprovalStatus(s: string): s is SupportClientApprovalStatus {
  return SUPPORT_CLIENT_APPROVAL_STATUSES.includes(s as SupportClientApprovalStatus)
}

export function isSupportClientApprovalAction(s: string): s is SupportClientApprovalAction {
  return SUPPORT_CLIENT_APPROVAL_ACTIONS.includes(s as SupportClientApprovalAction)
}

export const SUPPORT_CLIENT_APPROVAL_LABEL: Record<SupportClientApprovalStatus, string> = {
  pending: 'Pendiente de aprobación',
  approved: 'Aprobado por cliente',
  cancelled: 'Cancelado por cliente',
  changes_requested: 'Ajustes solicitados',
}

export function isSupportStatus(s: string): s is SupportStatus {
  return SUPPORT_STATUSES.includes(s as SupportStatus)
}

export function isSupportPriority(s: string): s is SupportPriority {
  return SUPPORT_PRIORITIES.includes(s as SupportPriority)
}

export function isSupportCaseType(s: string): s is SupportCaseType {
  return SUPPORT_TYPES.includes(s as SupportCaseType)
}

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  new: 'Nuevo',
  in_progress: 'En curso',
  waiting: 'En espera',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

export const SUPPORT_PRIORITY_LABEL: Record<SupportPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export const SUPPORT_TYPE_LABEL: Record<SupportCaseType, string> = {
  support: 'Soporte',
  improvement: 'Mejora',
  inquiry: 'Consulta',
  other: 'Otro',
}

export function supportStatusPillClass(status: string): string {
  const map: Record<string, string> = {
    new: 'bg-[#EDE9FE] text-[#6D28D9] dark:bg-[#2D1F6E] dark:text-[#C4B5FD]',
    in_progress: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    waiting: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
    resolved: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    closed: 'bg-[#F3F4F6] text-[#6B7280] dark:bg-[#252936] dark:text-[#9CA3AF]',
  }
  return map[status] ?? map.new
}

export function supportPriorityPillClass(priority: string): string {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  }
  return map[priority] ?? map.medium
}

/** Mapeo desde valor de opción (`soporte`) o etiqueta mostrada (`Soporte técnico`). */
export function mapSupportTypeFromAnswer(raw: string | null | undefined): SupportCaseType {
  const v = (raw ?? '').trim().toLowerCase()
  if (!v || v === '(sin respuesta)') return 'other'
  if (
    v === 'soporte' ||
    v === 'support' ||
    v.startsWith('soporte') ||
    v.includes('soporte técnico') ||
    v.includes('soporte tecnico')
  ) {
    return 'support'
  }
  if (
    v === 'mejora' ||
    v === 'improvement' ||
    v.includes('mejora') ||
    v.includes('funcionalidad')
  ) {
    return 'improvement'
  }
  if (v === 'consulta' || v === 'inquiry' || v.startsWith('consulta')) return 'inquiry'
  if (v === 'otro' || v === 'other') return 'other'
  return 'other'
}

export function mapSupportPriorityFromAnswer(raw: string | null | undefined): SupportPriority {
  const v = (raw ?? '').trim().toLowerCase()
  if (!v || v === '(sin respuesta)') return 'medium'
  if (v === 'alta' || v === 'high' || v.startsWith('alta') || v.includes('bloquea')) return 'high'
  if (v === 'baja' || v === 'low' || v.startsWith('baja')) return 'low'
  if (v === 'media' || v === 'medium' || v.startsWith('media')) return 'medium'
  return 'medium'
}

/** Notas de caso: quita bytes nulos y limita longitud (evita cortes al guardar en Postgres). */
export function sanitizeSupportNoteText(value: string): string {
  return value
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 8000)
}
