import { createHash, randomInt } from 'crypto'
import { and, desc, eq, gt } from 'drizzle-orm'
import { db } from '@/db'
import { clientInvitations, clientMembers, clientPortalLoginCodes } from '@/db/schema'
import { sendPortalLoginCodeEmail } from '@/lib/email/send-portal-code'
import { acceptClientInvitationByTokenForEmail } from '@/lib/client-invitations'
import { getClientInvitationPreview } from '@/lib/client-invitations'
import { env } from '@/lib/env'
import {
  PORTAL_CODE_RESEND_SECONDS,
  PORTAL_CODE_TTL_MINUTES,
} from '@/lib/portal-constants'
import { ValidationError, isAppError } from '@/lib/errors'
import { rethrowPortalDbError } from '@/lib/pg-relation-errors'
import { PortalLoginCodeEmailError } from '@/lib/email/send-portal-code'
import { publicAppBaseUrl } from '@/lib/outreach'
import { createLogger } from '@/lib/logger'

const log = createLogger('portal-login-codes')

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function hashCode(email: string, code: string): string {
  return createHash('sha256')
    .update(`${normalizeEmail(email)}:${code}:${env.CLERK_SECRET_KEY}`)
    .digest('hex')
}

function generateCode(): string {
  return String(randomInt(100000, 1000000))
}

export function portalEntrarUrl(args?: { email?: string; invite?: string }): string {
  const base = `${publicAppBaseUrl()}/portal/entrar`
  const params = new URLSearchParams()
  if (args?.email) params.set('email', normalizeEmail(args.email))
  if (args?.invite) params.set('invite', args.invite)
  const q = params.toString()
  return q ? `${base}?${q}` : base
}

async function emailHasPortalAccess(email: string): Promise<boolean> {
  const row = await db.query.clientMembers.findFirst({
    where: eq(clientMembers.email, normalizeEmail(email)),
    columns: { id: true },
  })
  return Boolean(row)
}

async function pickOrganizationIdForEmail(email: string, inviteToken?: string | null): Promise<string | null> {
  if (inviteToken) {
    const inv = await db.query.clientInvitations.findFirst({
      where: eq(clientInvitations.token, inviteToken),
      columns: { organizationId: true },
    })
    if (inv) return inv.organizationId
  }

  const member = await db.query.clientMembers.findFirst({
    where: eq(clientMembers.email, normalizeEmail(email)),
    columns: { organizationId: true },
  })
  return member?.organizationId ?? null
}

export async function issuePortalLoginCode(args: {
  email: string
  inviteToken?: string | null
  clientName?: string
  providerName?: string
}): Promise<{ sent: boolean; entrarUrl: string }> {
  try {
    const email = normalizeEmail(args.email)
    if (!email) throw new ValidationError('Correo inválido')

    if (args.inviteToken) {
      const preview = await getClientInvitationPreview(args.inviteToken)
      if (!preview) throw new ValidationError('Invitación no válida o expirada')
      if (preview.email !== email) {
        throw new ValidationError('Usa el correo de la invitación')
      }
    } else if (!(await emailHasPortalAccess(email))) {
      throw new ValidationError('No hay acceso al portal con ese correo')
    }

    const recent = await db.query.clientPortalLoginCodes.findFirst({
      where: and(
        eq(clientPortalLoginCodes.email, email),
        gt(clientPortalLoginCodes.createdAt, new Date(Date.now() - PORTAL_CODE_RESEND_SECONDS * 1000)),
      ),
      orderBy: [desc(clientPortalLoginCodes.createdAt)],
    })
    if (recent) {
      throw new ValidationError(`Espera ${PORTAL_CODE_RESEND_SECONDS} segundos antes de pedir otro código`)
    }

    const organizationId = await pickOrganizationIdForEmail(email, args.inviteToken)
    if (!organizationId) {
      throw new ValidationError('No se pudo resolver la configuración de correo del portal')
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + PORTAL_CODE_TTL_MINUTES * 60 * 1000)
    await db.insert(clientPortalLoginCodes).values({
      email,
      codeHash: hashCode(email, code),
      inviteToken: args.inviteToken ?? null,
      expiresAt,
    })

    const entrarUrl = portalEntrarUrl({ email, invite: args.inviteToken ?? undefined })
    const preview = args.inviteToken ? await getClientInvitationPreview(args.inviteToken) : null

    await sendPortalLoginCodeEmail({
      organizationId,
      to: email,
      code,
      entrarUrl,
      clientName: args.clientName ?? preview?.clientName ?? 'tu empresa',
      providerName: args.providerName ?? preview?.providerName ?? 'Dilo',
    })

    log.info({ email, invite: Boolean(args.inviteToken) }, 'Portal login code issued')
    return { sent: true, entrarUrl }
  } catch (err) {
    if (isAppError(err) || err instanceof PortalLoginCodeEmailError) throw err
    rethrowPortalDbError(err)
  }
}

export async function verifyPortalLoginCode(args: {
  email: string
  code: string
  inviteToken?: string | null
}): Promise<{ email: string }> {
  try {
    const email = normalizeEmail(args.email)
    const code = args.code.trim()
    if (!email || !/^\d{6}$/.test(code)) {
      throw new ValidationError('Correo o código inválido')
    }

    const row = await db.query.clientPortalLoginCodes.findFirst({
      where: and(
        eq(clientPortalLoginCodes.email, email),
        eq(clientPortalLoginCodes.codeHash, hashCode(email, code)),
        gt(clientPortalLoginCodes.expiresAt, new Date()),
      ),
      orderBy: [desc(clientPortalLoginCodes.createdAt)],
    })

    if (!row) throw new ValidationError('Código incorrecto o expirado')

    const inviteToken = args.inviteToken ?? row.inviteToken
    if (inviteToken) {
      const accepted = await acceptClientInvitationByTokenForEmail(inviteToken, email)
      if (!accepted) throw new ValidationError('Invitación no válida o expirada')
    } else if (!(await emailHasPortalAccess(email))) {
      throw new ValidationError('No hay acceso al portal con ese correo')
    }

    await db.delete(clientPortalLoginCodes).where(eq(clientPortalLoginCodes.id, row.id))

    return { email }
  } catch (err) {
    if (isAppError(err)) throw err
    rethrowPortalDbError(err)
  }
}
