/** Paleta fija para marcar ramas en el editor (solo panel, no afecta al visitante). */
export const STEP_BRANCH_COLOR_PRESETS = [
  { id: 'violet', hex: '#9C77F5' },
  { id: 'mint', hex: '#10B981' },
  { id: 'blue', hex: '#3B82F6' },
  { id: 'amber', hex: '#F59E0B' },
  { id: 'rose', hex: '#F43F5E' },
  { id: 'slate', hex: '#64748B' },
  { id: 'cyan', hex: '#06B6D4' },
  { id: 'orange', hex: '#EA580C' },
] as const

const HEX = /^#[0-9A-Fa-f]{6}$/

export function isValidBranchColorHex(s: string | null | undefined): boolean {
  return typeof s === 'string' && HEX.test(s)
}
