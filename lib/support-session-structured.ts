import { formatFileAnswerForBubble, isFilePayload } from '@/lib/public-flow-file-helpers'
import {
  formatMultiAnswerForDisplay,
  formatSelectAnswerForDisplay,
  normalizeMultiStored,
  selectStoredPrimaryValue,
} from '@/lib/step-choice-helpers'

export type SupportStepRow = {
  id: string
  type: string
  question: string
  variableName: string
  options: { label: string; value: string }[]
}

function displayAnswer(step: SupportStepRow, raw: string | null): string {
  if (raw == null || raw === '') return '(sin respuesta)'
  if (step.type === 'file') {
    try {
      const p = JSON.parse(raw) as unknown
      if (isFilePayload(p)) return formatFileAnswerForBubble(p)
    } catch {
      /* ignore */
    }
    return raw
  }
  if (step.type === 'multi_select') {
    return formatMultiAnswerForDisplay(raw, step.options)
  }
  if (step.type === 'select') {
    return formatSelectAnswerForDisplay(raw, step.options)
  }
  if (step.type === 'yes_no') {
    if (raw === 'yes') return 'Sí'
    if (raw === 'no') return 'No'
    return raw
  }
  return raw
}

function rawAnswer(step: SupportStepRow, raw: string | null): string {
  if (raw == null || raw === '') return '(sin respuesta)'
  if (step.type === 'select') {
    return selectStoredPrimaryValue(raw)
  }
  if (step.type === 'multi_select') {
    const { values } = normalizeMultiStored(raw)
    return values.length > 0 ? values.join(', ') : raw
  }
  return displayAnswer(step, raw)
}

/** Etiquetas legibles (resultados, transcript). */
export function buildStructuredFromSteps(
  stepRows: SupportStepRow[],
  answerByStep: Record<string, string | null>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of stepRows) {
    out[s.variableName] = displayAnswer(s, answerByStep[s.id] ?? null)
  }
  return out
}

/** Valores crudos de opciones (p. ej. `soporte`, `mejora`) para casos de soporte. */
export function buildStructuredRawFromSteps(
  stepRows: SupportStepRow[],
  answerByStep: Record<string, string | null>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of stepRows) {
    out[s.variableName] = rawAnswer(s, answerByStep[s.id] ?? null)
  }
  return out
}
