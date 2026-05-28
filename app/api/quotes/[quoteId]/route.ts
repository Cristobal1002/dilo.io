import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { quotes } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { quoteRowToClient } from '@/lib/quotes-db'
import { isQuoteStatus, parseQuoteLineItems, type QuoteLineItem } from '@/lib/quotes'
import { withApiHandler } from '@/lib/with-api-handler'

const LineItemSchema = z.object({
  id: z.string().uuid(),
  itemLabel: z.string().max(300),
  reference: z.string().max(120),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100),
  taxPercent: z.number().min(0).max(100),
  description: z.string().max(4000),
  quantity: z.number().min(0).max(99999),
})

const PatchBody = z
  .object({
    status: z
      .string()
      .optional()
      .refine((s) => s === undefined || isQuoteStatus(s), 'Estado inválido'),
    clientName: z.string().max(300).nullable().optional(),
    clientTaxId: z.string().max(80).nullable().optional(),
    clientPhone: z.string().max(80).nullable().optional(),
    clientEmail: z.union([z.string().max(320), z.null()]).optional(),
    issueDate: z.string().optional(),
    dueDate: z.union([z.string(), z.null()]).optional(),
    lineItems: z.array(LineItemSchema).optional(),
    aiPrompt: z.string().max(12000).nullable().optional(),
    notes: z.string().max(8000).nullable().optional(),
    globalDiscountPercent: z.number().min(0).max(100).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Sin cambios' })

async function getQuote(quoteId: string, organizationId: string) {
  return db.query.quotes.findFirst({
    where: and(eq(quotes.id, quoteId), eq(quotes.organizationId, organizationId)),
  })
}

export const GET = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const row = await getQuote(params.quoteId, auth.org.id)
  if (!row) throw new NotFoundError('Cotización')
  return apiSuccess({ quote: quoteRowToClient(row) })
}, { requireAuth: true })

export const PATCH = withApiHandler(async (req: NextRequest, { auth, params }) => {
  const existing = await getQuote(params.quoteId, auth.org.id)
  if (!existing) throw new NotFoundError('Cotización')

  const body = await req.json()
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const patch: Partial<typeof quotes.$inferInsert> = { updatedAt: new Date() }

  if (parsed.data.status !== undefined) patch.status = parsed.data.status
  if (parsed.data.clientName !== undefined) patch.clientName = parsed.data.clientName?.trim() || null
  if (parsed.data.clientTaxId !== undefined) patch.clientTaxId = parsed.data.clientTaxId?.trim() || null
  if (parsed.data.clientPhone !== undefined) patch.clientPhone = parsed.data.clientPhone?.trim() || null
  if (parsed.data.clientEmail !== undefined) patch.clientEmail = parsed.data.clientEmail?.trim() || null
  if (parsed.data.aiPrompt !== undefined) patch.aiPrompt = parsed.data.aiPrompt?.trim() || null
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes?.trim() || null
  if (parsed.data.globalDiscountPercent !== undefined) {
    patch.globalDiscountPercent = parsed.data.globalDiscountPercent
  }
  if (parsed.data.lineItems !== undefined) {
    patch.lineItems = parsed.data.lineItems as QuoteLineItem[]
  }
  if (parsed.data.issueDate !== undefined) {
    const d = new Date(parsed.data.issueDate)
    if (!Number.isFinite(d.getTime())) throw new ValidationError('Fecha inválida')
    patch.issueDate = d
  }
  if (parsed.data.dueDate !== undefined) {
    if (parsed.data.dueDate === null) {
      patch.dueDate = null
    } else {
      const d = new Date(parsed.data.dueDate)
      if (!Number.isFinite(d.getTime())) throw new ValidationError('Vencimiento inválido')
      patch.dueDate = d
    }
  }

  const [row] = await db
    .update(quotes)
    .set(patch)
    .where(eq(quotes.id, params.quoteId))
    .returning()

  return apiSuccess({ quote: quoteRowToClient(row) })
}, { requireAuth: true })

export const DELETE = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const existing = await getQuote(params.quoteId, auth.org.id)
  if (!existing) throw new NotFoundError('Cotización')
  await db.delete(quotes).where(eq(quotes.id, params.quoteId))
  return apiSuccess({ deleted: true })
}, { requireAuth: true })
