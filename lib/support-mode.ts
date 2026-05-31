import { isSupportFlow } from '@/lib/support-flow-purpose'

export type SupportMode = 'direct' | 'deflect_then_form'

export function getSupportMode(settings: unknown): SupportMode {
  if (!settings || typeof settings !== 'object') return 'direct'
  const m = (settings as Record<string, unknown>).support_mode
  return m === 'deflect_then_form' ? 'deflect_then_form' : 'direct'
}

export function shouldDeflectBeforeForm(settings: unknown): boolean {
  return isSupportFlow(settings) && getSupportMode(settings) === 'deflect_then_form'
}
