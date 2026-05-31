import { z } from 'zod'

export const KnowledgeArticleBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(10).max(50_000),
  clientId: z.string().uuid().nullable().optional(),
  status: z.enum(['published', 'draft']).optional(),
})

export const KnowledgeArticlePatchSchema = KnowledgeArticleBodySchema.partial()
