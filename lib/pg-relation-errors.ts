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

export function isMissingRelation(err: unknown, relation: string): boolean {
  return isMissingRelationMessage(collectErrorText(err), relation)
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
  if (isMissingRelation(err, relation)) {
    throw new SchemaOutdatedError(
      `Falta la tabla «${relation}» en la base de datos. En producción ejecuta «npm run db:push» (con el DATABASE_URL de Vercel).`,
    )
  }
  throw err
}

/** Errores de Postgres típicos del portal de cliente (migraciones 0022–0024). */
export function rethrowPortalDbError(err: unknown): never {
  if (isMissingRelation(err, 'client_portal_login_codes')) {
    throw new SchemaOutdatedError(
      'Falta la tabla client_portal_login_codes. Ejecuta «npm run db:push» contra el DATABASE_URL de producción (migración 0024).',
    )
  }
  if (isMissingRelation(err, 'client_invitations')) {
    throw new SchemaOutdatedError(
      'Falta la tabla client_invitations. Ejecuta «npm run db:push» (migración 0022).',
    )
  }

  const blob = collectErrorText(err)
  if (/clerk_id/i.test(blob) && /not-null|null value in column/i.test(blob)) {
    throw new SchemaOutdatedError(
      'client_members.clerk_id debe permitir NULL para el portal OTP. Aplica la migración 0023 con «npm run db:push».',
    )
  }

  throw err
}
