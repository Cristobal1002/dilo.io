import { isSupportFlow } from '@/lib/support-flow-purpose'

export const DEFAULT_SUBMIT_ANOTHER_LABEL = 'Enviar otra respuesta'
export const DEFAULT_SUBMIT_ANOTHER_SUPPORT_LABEL = 'Enviar otro caso de soporte'

export type FlowSubmissionSettings = {
  allowMultipleSubmissions: boolean
  submitAnotherLabel: string
}

/** Lectura de `allow_multiple_submissions` y texto del botón en el formulario público. */
export function getFlowSubmissionSettings(settings: unknown): FlowSubmissionSettings {
  const raw =
    settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {}

  const explicit = raw.allow_multiple_submissions
  const allowMultipleSubmissions =
    typeof explicit === 'boolean' ? explicit : isSupportFlow(settings)

  const labelRaw = raw.submit_another_label
  const submitAnotherLabel =
    typeof labelRaw === 'string' && labelRaw.trim()
      ? labelRaw.trim()
      : isSupportFlow(settings)
        ? DEFAULT_SUBMIT_ANOTHER_SUPPORT_LABEL
        : DEFAULT_SUBMIT_ANOTHER_LABEL

  return { allowMultipleSubmissions, submitAnotherLabel }
}
