import { createHmac, timingSafeEqual } from 'node:crypto'

import { resolveClientForEmbed } from '@/lib/support-clients'

export type EmbedContextPayload = {
  v: 1
  flowId: string
  clientId: string
  exp: number
}

function embedSecret(): string {
  return (
    process.env.DILO_EMBED_CONTEXT_SECRET?.trim() ||
    process.env.DILO_INTEGRATION_SECRETS_KEY?.trim() ||
    'dilo-dev-embed-context'
  )
}

export function signEmbedContext(args: {
  flowId: string
  clientId: string
  ttlSeconds?: number
}): { token: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? 3600)
  const payload: EmbedContextPayload = {
    v: 1,
    flowId: args.flowId,
    clientId: args.clientId,
    exp,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', embedSecret()).update(body).digest('base64url')
  return { token: `${body}.${sig}`, expiresAt: new Date(exp * 1000).toISOString() }
}

export function verifyEmbedContext(token: string, expectedFlowId: string): EmbedContextPayload | null {
  const parts = token.trim().split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = createHmac('sha256', embedSecret()).update(body).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  let payload: EmbedContextPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as EmbedContextPayload
  } catch {
    return null
  }
  if (payload.v !== 1) return null
  if (payload.flowId !== expectedFlowId) return null
  if (typeof payload.clientId !== 'string' || !payload.clientId) return null
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

/** Resuelve clientId desde query de embed: token firmado o UUID directo. */
export function parseEmbedClientQuery(args: {
  flowId: string
  ctx?: string | null
  client?: string | null
}): { clientId: string | null; source: 'token' | 'param' | null } {
  const ctx = args.ctx?.trim()
  if (ctx) {
    const verified = verifyEmbedContext(ctx, args.flowId)
    if (verified) return { clientId: verified.clientId, source: 'token' }
    return { clientId: null, source: null }
  }
  const client = args.client?.trim()
  if (client && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(client)) {
    return { clientId: client, source: 'param' }
  }
  return { clientId: null, source: null }
}

/** Valida contexto desde query string del iframe (antes de crear sesión). */
export async function resolveEmbedContextForFlow(args: {
  flowId: string
  organizationId: string
  ctx?: string | null
  client?: string | null
  externalId?: string | null
}): Promise<SessionEmbedContext | null> {
  const parsed = parseEmbedClientQuery({
    flowId: args.flowId,
    ctx: args.ctx,
    client: args.client,
  })
  if (parsed.clientId && parsed.source) {
    const row = await resolveClientForEmbed({
      organizationId: args.organizationId,
      clientId: parsed.clientId,
    })
    if (row) return { clientId: row.id, source: parsed.source }
  }
  if (args.externalId?.trim()) {
    const row = await resolveClientForEmbed({
      organizationId: args.organizationId,
      externalId: args.externalId.trim(),
    })
    if (row) return { clientId: row.id, source: 'param' }
  }
  return null
}

export type SessionEmbedContext = {
  clientId: string
  source: 'token' | 'param' | 'session'
}

export function readSessionEmbedContext(metadata: unknown): SessionEmbedContext | null {
  if (!metadata || typeof metadata !== 'object') return null
  const ec = (metadata as { embedContext?: unknown }).embedContext
  if (!ec || typeof ec !== 'object') return null
  const clientId = (ec as { clientId?: unknown }).clientId
  const source = (ec as { source?: unknown }).source
  if (typeof clientId !== 'string' || !clientId) return null
  const src = source === 'token' || source === 'param' || source === 'session' ? source : 'session'
  return { clientId, source: src }
}
