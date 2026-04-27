/**
 * Mapea errores del AI SDK (generateObject / generateText) a {@link AppError}
 * para que la API no devuelva solo INTERNAL_ERROR.
 */
import { env } from '@/lib/env'
import { AiConfigurationError, AppError, isAppError, RateLimitError, UpstreamAiError } from '@/lib/errors'

function isAiSdkHttpError(err: unknown): err is {
  name?: string
  statusCode?: number
  message?: string
} {
  if (!err || typeof err !== 'object') return false
  const o = err as Record<string, unknown>
  const n = String(o.name ?? '')
  if (n === 'AI_APICallError' || n === 'APICallError') return true
  return false
}

export function upstreamErrorFromAiSdk(err: unknown): AppError | null {
  if (isAppError(err)) return null
  if (!isAiSdkHttpError(err)) return null

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 0
  const message = typeof err.message === 'string' ? err.message : ''

  const devDetails =
    env.NODE_ENV === 'development'
      ? { statusCode, providerMessage: message.slice(0, 600) }
      : { statusCode: statusCode || undefined }

  if (statusCode === 429) {
    return new RateLimitError('El proveedor de IA está limitando solicitudes. Espera un momento e inténtalo de nuevo.')
  }

  const modelNotFound =
    statusCode === 404 ||
    /\bnot_found\b/i.test(message) ||
    /^model:/i.test(message.trim())

  if (modelNotFound) {
    return new UpstreamAiError(
      'El proveedor de IA no reconoce el modelo configurado. Revisa AI_ANTHROPIC_STRUCTURED_MODEL o AI_OPENAI_STRUCTURED_MODEL (por ejemplo claude-sonnet-4-6).',
      devDetails,
    )
  }

  if (statusCode === 401 || statusCode === 403) {
    return new UpstreamAiError(
      'La clave del proveedor de IA fue rechazada. Comprueba ANTHROPIC_API_KEY u OPENAI_API_KEY en el servidor.',
      devDetails,
    )
  }

  return new UpstreamAiError(
    'No pudimos obtener respuesta del proveedor de IA. Inténtalo de nuevo en unos segundos.',
    devDetails,
  )
}

/** Errores de configuración al arrancar la llamada (antes del fetch). */
export function configurationErrorFromUnknown(err: unknown): AppError | null {
  if (isAppError(err)) return null
  if (!(err instanceof Error)) return null
  const m = err.message
  if (m.includes('ANTHROPIC_API_KEY') || m.includes('OPENAI_API_KEY')) {
    return new AiConfigurationError(
      m.includes('anthropic')
        ? 'Falta ANTHROPIC_API_KEY o la combinación con AI_PROVIDER no es válida.'
        : 'Falta OPENAI_API_KEY o la combinación con AI_PROVIDER no es válida.',
    )
  }
  return null
}
