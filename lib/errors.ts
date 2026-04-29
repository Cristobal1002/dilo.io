/**
 * lib/errors.ts
 * Custom error hierarchy for Dilo.
 *
 * All AppErrors carry an HTTP status code and a machine-readable `code`
 * so the API can return consistent error shapes and the client can
 * branch on `code` without parsing messages.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = this.constructor.name
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/** 400 — Input failed validation */
export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

/** 401 — Not authenticated */
export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

/** 403 — Authenticated but not allowed */
export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403, 'FORBIDDEN')
  }
}

/** 404 — Resource not found */
export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND')
  }
}

/** 409 — Conflict (duplicate, etc.) */
export class ConflictError extends AppError {
  constructor(message = 'Conflicto con el estado actual') {
    super(message, 409, 'CONFLICT')
  }
}

/** 429 — Rate limit */
export class RateLimitError extends AppError {
  constructor(message = 'Demasiadas solicitudes. Intenta más tarde.') {
    super(message, 429, 'RATE_LIMIT')
  }
}

/** 500 — Unexpected server error */
export class InternalError extends AppError {
  constructor(message = 'Error interno del servidor') {
    super(message, 500, 'INTERNAL_ERROR')
  }
}

/**
 * 502 — Llamada a OpenAI/Anthropic falló (modelo inválido, caída, etc.).
 * El cliente puede mostrar `message` y ramificar con `code`.
 */
export class UpstreamAiError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, 'UPSTREAM_AI_ERROR', details)
  }
}

/** 503 — Falta API key o configuración del proveedor activo */
export class AiConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 503, 'AI_NOT_CONFIGURED')
  }
}

/**
 * 503 — La BD de este entorno no tiene tablas que exige esta versión del código
 * (p. ej. falta `drizzle-kit push` o una migración SQL).
 */
export class SchemaOutdatedError extends AppError {
  constructor(
    message = 'La base de datos no está al día con esta versión. Ejecuta migraciones o «npm run db:push» contra el DATABASE_URL de este entorno.',
  ) {
    super(message, 503, 'SCHEMA_OUTDATED')
  }
}

/** Type guard */
export const isAppError = (err: unknown): err is AppError =>
  err instanceof AppError
