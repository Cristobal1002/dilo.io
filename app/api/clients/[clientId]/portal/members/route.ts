import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { getAuthUserInOrg } from '@/lib/auth'
import {
  ClientPortalInviteLinkOnlyError,
  createClientPortalInvitation,
  listPendingClientInvitations,
  revokeClientPortalInvitation,
} from '@/lib/client-invitations'
import { ClientPortalInviteEmailError } from '@/lib/email/send-client-portal-invite'
import { listClientMembersForClient } from '@/lib/client-members'
import { removeClientMember } from '@/lib/client-members-store'
import { CLIENT_PORTAL_ROLES, isClientPortalRole } from '@/lib/client-portal-roles'
import { withApiHandler } from '@/lib/with-api-handler'

async function getClientForOrg(clientId: string, organizationId: string) {
  return db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)),
    columns: { id: true, name: true },
  })
}

export const GET = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  requireOrgRoles(auth, ['owner', 'admin'])
  const client = await getClientForOrg(params.clientId, auth.org.id)
  if (!client) throw new NotFoundError('Cliente')

  const [members, invitations] = await Promise.all([
    listClientMembersForClient(client.id),
    listPendingClientInvitations(client.id),
  ])

  return apiSuccess({ members, invitations, roles: CLIENT_PORTAL_ROLES })
}, { requireAuth: true })

const InviteBody = z.object({
  email: z.string().email(),
  role: z.string().refine(isClientPortalRole, 'Rol inválido'),
})

export const POST = withApiHandler(async (req: NextRequest, { auth, params }) => {
  requireOrgRoles(auth, ['owner', 'admin'])
  const client = await getClientForOrg(params.clientId, auth.org.id)
  if (!client) throw new NotFoundError('Cliente')

  const parsed = InviteBody.safeParse(await req.json())
  if (!parsed.success) throw new ValidationError('Datos inválidos')

  const me = await getAuthUserInOrg(auth)

  try {
    const row = await createClientPortalInvitation({
      organizationId: auth.org.id,
      clientId: client.id,
      invitedByUserId: me?.id ?? null,
      email: parsed.data.email,
      role: parsed.data.role,
    })
    return apiSuccess({
      invitation: {
        id: row.id,
        email: row.email,
        role: row.role,
      },
    })
  } catch (err) {
    if (err instanceof ClientPortalInviteLinkOnlyError) {
      return apiSuccess({
        invitation: err.invitation,
        inviteUrl: err.inviteUrl,
        linkOnly: true,
        message: err.message,
      })
    }
    if (err instanceof ClientPortalInviteEmailError) {
      throw new ValidationError(err.message)
    }
    throw err
  }
}, { requireAuth: true })

export const DELETE = withApiHandler(async (req: NextRequest, { auth, params }) => {
  requireOrgRoles(auth, ['owner', 'admin'])
  const client = await getClientForOrg(params.clientId, auth.org.id)
  if (!client) throw new NotFoundError('Cliente')

  const memberId = req.nextUrl.searchParams.get('memberId')
  const invitationId = req.nextUrl.searchParams.get('invitationId')

  if (memberId) {
    await removeClientMember({
      organizationId: auth.org.id,
      clientId: client.id,
      memberId,
    })
    return apiSuccess({ removed: 'member' })
  }

  if (invitationId) {
    await revokeClientPortalInvitation(auth.org.id, client.id, invitationId)
    return apiSuccess({ removed: 'invitation' })
  }

  throw new ValidationError('Indica memberId o invitationId')
}, { requireAuth: true })
