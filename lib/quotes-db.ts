import { eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { quotes } from '@/db/schema'
import { newQuoteLineItem, parseQuoteLineItems, type QuoteLineItem } from '@/lib/quotes'
import type { QuoteGenerationResult } from '@/lib/schemas/quote-generation'

export async function nextQuoteNumber(organizationId: string): Promise<number> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${quotes.quoteNumber}), 0)::int` })
    .from(quotes)
    .where(eq(quotes.organizationId, organizationId))
  return (Number(max) || 0) + 1
}

export function mapAiToLineItems(ai: QuoteGenerationResult): QuoteLineItem[] {
  return ai.line_items.map((row) =>
    newQuoteLineItem({
      itemLabel: row.item_label?.trim() || 'Servicio',
      reference: row.reference?.trim() || '',
      unitPrice: row.unit_price ?? 0,
      discountPercent: row.discount_percent ?? 0,
      taxPercent: row.tax_percent ?? 0,
      description: row.description?.trim() || '',
      quantity: Math.max(1, row.quantity ?? 1),
    }),
  )
}

export function quoteRowToClient(row: typeof quotes.$inferSelect) {
  return {
    id: row.id,
    quoteNumber: row.quoteNumber,
    status: row.status,
    flowId: row.flowId,
    sessionId: row.sessionId,
    clientName: row.clientName,
    clientTaxId: row.clientTaxId,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    issueDate: row.issueDate instanceof Date ? row.issueDate.toISOString() : String(row.issueDate),
    dueDate:
      row.dueDate instanceof Date
        ? row.dueDate.toISOString()
        : row.dueDate
          ? String(row.dueDate)
          : null,
    lineItems: parseQuoteLineItems(row.lineItems),
    aiPrompt: row.aiPrompt,
    notes: row.notes,
    globalDiscountPercent: Number(row.globalDiscountPercent) || 0,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}
