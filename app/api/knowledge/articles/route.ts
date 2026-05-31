import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { KnowledgeArticleBodySchema } from '@/lib/knowledge-api-schema'
import {
  articleToApi,
  createKnowledgeArticle,
  listKnowledgeArticles,
} from '@/lib/knowledge-articles'
import { requireOrgRoles } from '@/lib/org-role'
import { withApiHandler } from '@/lib/with-api-handler'

async function assertClientInOrg(organizationId: string, clientId: string | null | undefined) {
  if (!clientId) return
  const row = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
    columns: { id: true, organizationId: true },
  })
  if (!row || row.organizationId !== organizationId) {
    throw new ValidationError('Cliente inválido')
  }
}

export const GET = withApiHandler(async (_req: NextRequest, { auth }) => {
  const articles = await listKnowledgeArticles(auth.org.id)
  return apiSuccess({ articles })
}, { requireAuth: true })

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])
  const body = await req.json()
  const parsed = KnowledgeArticleBodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  await assertClientInOrg(auth.org.id, parsed.data.clientId ?? null)

  const row = await createKnowledgeArticle({
    organizationId: auth.org.id,
    title: parsed.data.title,
    body: parsed.data.body,
    clientId: parsed.data.clientId ?? null,
    status: parsed.data.status,
  })

  return apiSuccess({ article: articleToApi(row) })
}, { requireAuth: true })
