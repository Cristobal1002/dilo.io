export const CLIENT_PORTAL_ROLES = ['viewer', 'coordinator', 'manager'] as const
export type ClientPortalRole = (typeof CLIENT_PORTAL_ROLES)[number]

export const CLIENT_PORTAL_ROLE_LABEL: Record<ClientPortalRole, string> = {
  viewer: 'Solo lectura',
  coordinator: 'Coordinador',
  manager: 'Gerente',
}

export function isClientPortalRole(value: string): value is ClientPortalRole {
  return CLIENT_PORTAL_ROLES.includes(value as ClientPortalRole)
}

export function canPortalEditPriority(role: ClientPortalRole): boolean {
  return role === 'manager'
}

export function canPortalEditNotes(role: ClientPortalRole): boolean {
  return role === 'manager' || role === 'coordinator'
}
