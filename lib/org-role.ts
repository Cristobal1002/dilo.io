import { ForbiddenError } from '@/lib/errors'

/** Subconjunto de `AuthContext` para evitar dependencia circular con `lib/auth`. */
export type OrgAuthLike = { orgRole?: string | null }

/** Roles persistidos en `users.role`. */
export const ORG_ROLES = ['owner', 'admin', 'member'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export function isOrgRole(value: string): value is OrgRole {
  return ORG_ROLES.includes(value as OrgRole)
}

export function normalizeOrgRole(value: string | null | undefined): OrgRole {
  if (value && isOrgRole(value)) return value
  return 'member'
}

/** Puede conectar integraciones (Resend, WhatsApp, etc.) a nivel workspace. */
export function canManageIntegrations(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin'
}

/** Puede gestionar facturación / plan (solo owner por defecto). */
export function canManageBilling(role: OrgRole): boolean {
  return role === 'owner'
}

/**
 * Lanza `ForbiddenError` si el rol actual no está permitido.
 * Usar en rutas API después de `getAuthContext()`.
 */
export function requireOrgRoles(auth: OrgAuthLike, allowed: readonly OrgRole[]): void {
  const role = normalizeOrgRole(auth.orgRole)
  if (!allowed.includes(role)) {
    throw new ForbiddenError('No tienes permisos para esta acción')
  }
}
