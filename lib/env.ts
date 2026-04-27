/**
 * lib/env.ts
 * Typed + validated environment variables.
 * Fails fast at startup if a required variable is missing.
 * Import from here instead of process.env directly.
 */
import { z } from 'zod'

const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),

  /**
   * Solo rutas que llaman a OpenAI la necesitan; no puede bloquear el resto de la API
   * (p. ej. settings/me) porque `logger` importa este módulo en todas las rutas.
   */
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),

  /** API key de Anthropic; obligatoria si `AI_PROVIDER=anthropic`. */
  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),

  /**
   * `openai` (default) o `anthropic` (Claude). Requiere la clave del proveedor activo.
   * También acepta el alias `claude`.
   */
  AI_PROVIDER: z
    .string()
    .optional()
    .transform((v): 'openai' | 'anthropic' => {
      const t = v?.trim().toLowerCase()
      if (t === 'anthropic' || t === 'claude') return 'anthropic'
      return 'openai'
    }),

  /** Overrides opcionales de id de modelo (p. ej. `gpt-4o`, `claude-sonnet-4-20250514`). */
  AI_OPENAI_STRUCTURED_MODEL: z.string().optional().transform((v) => (v?.trim() ? v.trim() : undefined)),
  AI_OPENAI_FAST_MODEL: z.string().optional().transform((v) => (v?.trim() ? v.trim() : undefined)),
  AI_ANTHROPIC_STRUCTURED_MODEL: z.string().optional().transform((v) => (v?.trim() ? v.trim() : undefined)),
  AI_ANTHROPIC_FAST_MODEL: z.string().optional().transform((v) => (v?.trim() ? v.trim() : undefined)),

  /**
   * En Vercel a veces queda definida pero vacía; `z.string().url().default()` no aplica si llega "".
   */
  NEXT_PUBLIC_APP_URL: z
    .string()
    .optional()
    .transform((v) => {
      const fallback = 'http://localhost:3000'
      const t = v?.trim()
      if (!t) return fallback
      try {
        return new URL(t).toString()
      } catch {
        return fallback
      }
    }),

  // Optional
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables — check .env.local or Vercel project env')
}

export const env = parsed.data
