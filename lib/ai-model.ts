/**
 * Selección de proveedor LLM vía `AI_PROVIDER` + claves en env.
 * Usar en generateObject / generateText en rutas API.
 */
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { AiConfigurationError } from '@/lib/errors'
import { env } from '@/lib/env'

/** Modelos por defecto (override opcional con env). */
const OPENAI_STRUCTURED = env.AI_OPENAI_STRUCTURED_MODEL?.trim() || 'gpt-4o'
const OPENAI_FAST = env.AI_OPENAI_FAST_MODEL?.trim() || 'gpt-4o-mini'
/** IDs vigentes en la API de Anthropic (3.5 retirados — ver docs de deprecaciones). */
const ANTHROPIC_STRUCTURED = env.AI_ANTHROPIC_STRUCTURED_MODEL?.trim() || 'claude-sonnet-4-6'
const ANTHROPIC_FAST = env.AI_ANTHROPIC_FAST_MODEL?.trim() || 'claude-haiku-4-5-20251001'

export type AiProviderId = 'openai' | 'anthropic'

export function getAiProvider(): AiProviderId {
  return env.AI_PROVIDER
}

/**
 * Lanza si el proveedor activo no tiene API key (p. ej. antes de generate).
 * Mensaje genérico al cliente; detalle en logs de la ruta.
 */
export function assertGenerativeAiConfigured(): void {
  if (env.AI_PROVIDER === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY) {
      throw new AiConfigurationError('AI_PROVIDER=anthropic requiere ANTHROPIC_API_KEY en el entorno.')
    }
    return
  }
  if (!env.OPENAI_API_KEY) {
    throw new AiConfigurationError('AI_PROVIDER=openai requiere OPENAI_API_KEY en el entorno.')
  }
}

/** generateObject: generar flows, análisis de sesión, chat del editor. */
export function getStructuredOutputModel() {
  return env.AI_PROVIDER === 'anthropic'
    ? anthropic(ANTHROPIC_STRUCTURED)
    : openai(OPENAI_STRUCTURED)
}

/** generateText: acuses breves entre pasos del flow público. */
export function getFastTextModel() {
  return env.AI_PROVIDER === 'anthropic' ? anthropic(ANTHROPIC_FAST) : openai(OPENAI_FAST)
}
