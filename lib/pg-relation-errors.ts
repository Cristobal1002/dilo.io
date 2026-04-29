import { SchemaOutdatedError } from '@/lib/errors'

function collectErrorText(err: unknown): string {
  const parts: string[] = []
  let e: unknown = err
  for (let depth = 0; e != null && depth < 8; depth++) {
    if (e instanceof Error) {
      parts.push(e.message)
      const code = (e as NodeJS.ErrnoException).code
      if (code) parts.push(String(code))
    } else if (typeof e === 'object' && 'message' in (e as object)) {
      parts.push(String((e as { message: unknown }).message))
    }
    if (typeof e === 'object' && e && 'code' in e) {
      parts.push(String((e as { code: unknown }).code))
    }
    const next =
      e instanceof Error && e.cause !== undefined
        ? e.cause
        : typeof e === 'object' && e && 'cause' in e
          ? (e as { cause: unknown }).cause
          : undefined
    e = next
  }
  return parts.join(' ')
}

function isMissingRelationMessage(blob: string, relation: string): boolean {
  if (/\b42P01\b/.test(blob)) return true
  const escaped = relation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`relation\\s+["']?${escaped}["']?\\s+does\\s+not\\s+exist`, 'i').test(blob)
}

/**
 * Si Postgres indica que falta la tabla, lanza {@link SchemaOutdatedError};
 * en caso contrario relanza el error original.
 */
export function rethrowUnlessMissingRelation(err: unknown, relation: string): never {
  const blob = collectErrorText(err)
  if (isMissingRelationMessage(blob, relation)) {
    throw new SchemaOutdatedError(
      `Falta la tabla «${relation}» en la base de datos. En producción ejecuta «npm run db:push» (con el DATABASE_URL de Vercel) o aplica la migración db/migrations/0004_org_integration_credentials.sql.`,
    )
  }
  throw err
}
