import { shouldDeflectBeforeForm } from '@/lib/support-mode'
import { isSupportFlow } from '@/lib/support-flow-purpose'

export type DeflectionOutcome = 'resolved' | 'escalated'

export type SessionDeflectionMeta = {
  deflectionOutcome?: DeflectionOutcome | null
  deflectionQuery?: string | null
  deflectionAnswer?: string | null
}

export function readSessionDeflection(metadata: unknown): SessionDeflectionMeta {
  if (!metadata || typeof metadata !== 'object') return {}
  const o = metadata as Record<string, unknown>
  const outcome = o.deflectionOutcome
  return {
    deflectionOutcome:
      outcome === 'resolved' || outcome === 'escalated' ? outcome : null,
    deflectionQuery: typeof o.deflectionQuery === 'string' ? o.deflectionQuery : null,
    deflectionAnswer: typeof o.deflectionAnswer === 'string' ? o.deflectionAnswer : null,
  }
}

export function shouldCreateSupportCase(args: {
  flowSettings: unknown
  sessionMetadata: unknown
}): boolean {
  if (!isSupportFlow(args.flowSettings)) return false
  const deflection = readSessionDeflection(args.sessionMetadata)
  if (deflection.deflectionOutcome === 'resolved') return false
  if (shouldDeflectBeforeForm(args.flowSettings)) {
    return deflection.deflectionOutcome === 'escalated'
  }
  return true
}

export function shouldSkipSessionAnalysis(sessionMetadata: unknown): boolean {
  return readSessionDeflection(sessionMetadata).deflectionOutcome === 'resolved'
}
