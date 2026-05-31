import { randomBytes } from 'node:crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, sessions } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiCreated } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import {
  resolveEmbedContextForFlow,
  verifyEmbedContext,
  type SessionEmbedContext,
} from '@/lib/embed-context'
import { loadPublishedFlowWithSteps } from '@/lib/load-published-flow'
import { resolveClientForEmbed } from '@/lib/support-clients'

const flowIdSchema = z.string().uuid()

const CreateBodySchema = z
  .object({
    embedContext: z
      .object({
        clientId: z.string().uuid().optional(),
        externalId: z.string().trim().min(1).max(120).optional(),
        ctx: z.string().trim().min(10).max(4000).optional(),
      })
      .optional(),
  })
  .optional()

async function resolveEmbedContextForSession(args: {
  flowId: string
  organizationId: string
  raw?: z.infer<typeof CreateBodySchema>
}): Promise<SessionEmbedContext | null> {
  const raw = args.raw?.embedContext
  if (!raw) return null

  if (raw.ctx) {
    const verified = verifyEmbedContext(raw.ctx, args.flowId)
    if (!verified) throw new ValidationError('Token de contexto embed inválido o expirado')
    const client = await resolveClientForEmbed({
      organizationId: args.organizationId,
      clientId: verified.clientId,
    })
    if (!client) throw new ValidationError('Cliente del contexto embed no encontrado')
    return { clientId: client.id, source: 'token' }
  }

  const client = await resolveClientForEmbed({
    organizationId: args.organizationId,
    clientId: raw.clientId,
    externalId: raw.externalId,
  })
  if (!client) throw new ValidationError('Cliente embed no encontrado o inactivo')
  return { clientId: client.id, source: 'param' }
}

/**
 * Crea una sesión pública (token opaco) para responder un flow publicado.
 * Opcional: embedContext (clientId, externalId o ctx firmado) para omitir paso empresa.
 */
export const POST = withApiHandler(
  async (req: NextRequest, { params }) => {
    const { flowId } = params
    if (!flowIdSchema.safeParse(flowId).success) {
      throw new NotFoundError('Flow')
    }

    await loadPublishedFlowWithSteps(flowId)
    const flowRow = await db.query.flows.findFirst({
      where: eq(flows.id, flowId),
      columns: { organizationId: true },
    })
    if (!flowRow) throw new NotFoundError('Flow')

    let body: z.infer<typeof CreateBodySchema> = {}
    try {
      const json = await req.json()
      const parsed = CreateBodySchema.safeParse(json)
      if (parsed.success && parsed.data) body = parsed.data
    } catch {
      /* body vacío OK */
    }

    const embedContext = await resolveEmbedContextForSession({
      flowId,
      organizationId: flowRow.organizationId,
      raw: body,
    })

    const token = randomBytes(32).toString('hex')
    const metadata: Record<string, unknown> = { currentStepIndex: 0 }
    if (embedContext) {
      metadata.embedContext = embedContext
    }

    const [row] = await db
      .insert(sessions)
      .values({
        flowId,
        token,
        status: 'in_progress',
        metadata,
      })
      .returning({ id: sessions.id, token: sessions.token, status: sessions.status })

    if (!row) throw new NotFoundError('Flow')

    return apiCreated({
      session: {
        id: row.id,
        token: row.token,
        status: row.status,
        embedContext: embedContext ?? undefined,
      },
    })
  },
  { requireAuth: false },
)

export { resolveEmbedContextForFlow }
