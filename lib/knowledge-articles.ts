import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { knowledgeArticles } from '@/db/schema'

export type KnowledgeArticleRow = typeof knowledgeArticles.$inferSelect

export function articleToApi(row: KnowledgeArticleRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    clientId: row.clientId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listKnowledgeArticles(organizationId: string) {
  const rows = await db.query.knowledgeArticles.findMany({
    where: eq(knowledgeArticles.organizationId, organizationId),
    orderBy: [asc(knowledgeArticles.title)],
  })
  return rows.map(articleToApi)
}

export async function searchKnowledgeArticles(args: {
  organizationId: string
  query: string
  clientId?: string | null
  limit?: number
}) {
  const q = args.query.trim()
  if (q.length < 2) return []

  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6)

  if (terms.length === 0) return []

  const pattern = `%${terms.join('%')}%`
  const clientId = args.clientId?.trim() || null

  const rows = await db.query.knowledgeArticles.findMany({
    where: and(
      eq(knowledgeArticles.organizationId, args.organizationId),
      eq(knowledgeArticles.status, 'published'),
      or(ilike(knowledgeArticles.title, pattern), ilike(knowledgeArticles.body, pattern)),
      clientId
        ? or(eq(knowledgeArticles.clientId, clientId), sql`${knowledgeArticles.clientId} IS NULL`)
        : sql`${knowledgeArticles.clientId} IS NULL`,
    ),
    limit: args.limit ?? 5,
    orderBy: [asc(knowledgeArticles.title)],
  })

  return rows
}

export async function createKnowledgeArticle(args: {
  organizationId: string
  title: string
  body: string
  clientId?: string | null
  status?: 'published' | 'draft'
}) {
  const [row] = await db
    .insert(knowledgeArticles)
    .values({
      organizationId: args.organizationId,
      title: args.title.trim(),
      body: args.body.trim(),
      clientId: args.clientId ?? null,
      status: args.status ?? 'published',
    })
    .returning()
  return row
}

export async function updateKnowledgeArticle(args: {
  organizationId: string
  id: string
  patch: Partial<{
    title: string
    body: string
    clientId: string | null
    status: 'published' | 'draft'
  }>
}) {
  const now = new Date()
  const [row] = await db
    .update(knowledgeArticles)
    .set({
      ...(args.patch.title !== undefined ? { title: args.patch.title.trim() } : {}),
      ...(args.patch.body !== undefined ? { body: args.patch.body.trim() } : {}),
      ...(args.patch.clientId !== undefined ? { clientId: args.patch.clientId } : {}),
      ...(args.patch.status !== undefined ? { status: args.patch.status } : {}),
      updatedAt: now,
    })
    .where(
      and(
        eq(knowledgeArticles.id, args.id),
        eq(knowledgeArticles.organizationId, args.organizationId),
      ),
    )
    .returning()
  return row ?? null
}

export async function deleteKnowledgeArticle(args: { organizationId: string; id: string }) {
  const [row] = await db
    .delete(knowledgeArticles)
    .where(
      and(
        eq(knowledgeArticles.id, args.id),
        eq(knowledgeArticles.organizationId, args.organizationId),
      ),
    )
    .returning({ id: knowledgeArticles.id })
  return Boolean(row)
}
