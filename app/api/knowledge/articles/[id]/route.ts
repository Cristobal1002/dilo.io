import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { KnowledgeArticlePatchSchema } from '@/lib/knowledge-api-schema'
import { articleToApi, deleteKnowledgeArticle, updateKnowledgeArticle } from '@/lib/knowledge-articles'
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

export const PATCH = withApiHandler(
  async (req: NextRequest, { auth, params }) => {
    requireOrgRoles(auth, ['owner', 'admin'])
    const id = params.id
    if (!id) throw new NotFoundError('Artículo')

    const body = await req.json()
    const parsed = KnowledgeArticlePatchSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
    }

    if (parsed.data.clientId !== undefined) {
      await assertClientInOrg(auth.org.id, parsed.data.clientId)
    }

    const row = await updateKnowledgeArticle({
      organizationId: auth.org.id,
      id,
      patch: parsed.data,
    })
    if (!row) throw new NotFoundError('Artículo')

    return apiSuccess({ article: articleToApi(row) })
  },
  { requireAuth: true },
)

export const DELETE = withApiHandler(
  async (_req: NextRequest, { auth, params }) => {
    requireOrgRoles(auth, ['owner', 'admin'])
    const id = params.id
    if (!id) throw new NotFoundError('Artículo')

    const ok = await deleteKnowledgeArticle({ organizationId: auth.org.id, id })
    if (!ok) throw new NotFoundError('Artículo')

    return apiSuccess({ deleted: true })
  },
  { requireAuth: true },
)
