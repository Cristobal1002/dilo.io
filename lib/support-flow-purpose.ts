export type FlowPurpose = 'support'

export function getFlowPurpose(settings: unknown): FlowPurpose | null {
  if (!settings || typeof settings !== 'object') return null
  const p = (settings as Record<string, unknown>).purpose
  return p === 'support' ? 'support' : null
}

export function isSupportFlow(settings: unknown): boolean {
  return getFlowPurpose(settings) === 'support'
}
