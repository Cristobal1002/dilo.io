/**
 * lib/logger.ts
 * Structured logger using pino.
 *
 * In development: pretty-prints to stdout (pipe through pino-pretty or use LOG_PRETTY=true).
 * In production: outputs JSON — Vercel captures it as structured logs.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ flowId }, 'Flow generated successfully')
 *   logger.error({ err, userId }, 'Failed to generate flow')
 */
import pino from 'pino'
import { env } from './env'

const isDev = env.NODE_ENV === 'development'

export const logger = pino({
  level: env.LOG_LEVEL,
  // In development, use pino-pretty if available; in production, raw JSON for Vercel
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  // Redact sensitive fields before they hit logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  // Base fields added to every log line
  base: {
    env: env.NODE_ENV,
  },
})

/**
 * Create a child logger with a fixed context.
 * Useful for scoping logs to a specific module or request.
 *
 * Example:
 *   const log = createLogger('flows/generate')
 *   log.info({ userId }, 'Starting generation')
 */
export const createLogger = (module: string) =>
  logger.child({ module })
