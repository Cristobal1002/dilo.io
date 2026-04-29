import type { flows, organizations } from '@/db/schema'

type OrgCols = Pick<
  typeof organizations.$inferSelect,
  'outreachColdEmailBodyMarkdown' | 'outreachColdEmailCtaLabel'
>
type FlowCols = Pick<
  typeof flows.$inferSelect,
  'outreachColdEmailBodyMarkdown' | 'outreachColdEmailCtaLabel'
>

/**
 * Plantilla cold: override por flow si existe; si no, workspace; vacío en ambos → null (default en código).
 */
export function resolveOutreachColdTemplate(
  org: OrgCols | null | undefined,
  flow: FlowCols | null | undefined,
): { bodyMarkdown: string | null; ctaLabel: string | null } {
  const bodyFlow = flow?.outreachColdEmailBodyMarkdown?.trim()
  const bodyOrg = org?.outreachColdEmailBodyMarkdown?.trim()
  const bodyMarkdown = bodyFlow || bodyOrg || null

  const ctaFlow = flow?.outreachColdEmailCtaLabel?.trim()
  const ctaOrg = org?.outreachColdEmailCtaLabel?.trim()
  const ctaLabel = ctaFlow || ctaOrg || null

  return { bodyMarkdown, ctaLabel }
}
