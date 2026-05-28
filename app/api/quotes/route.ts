import { NextRequest } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { quotes } from '@/db/schema'
import { apiCreated, apiSuccess } from '@/lib/api-response'
import { nextQuoteNumber, quoteRowToClient } from '@/lib/quotes-db'
import { newQuoteLineItem } from '@/lib/quotes'
import { withApiHandler } from '@/lib/with-api-handler'

export const GET = withApiHandler(async (_req: NextRequest, { auth }) => {
  const rows = await db.query.quotes.findMany({
    where: eq(quotes.organizationId, auth.org.id),
    orderBy: [desc(quotes.updatedAt)],
    limit: 100,
  })
  return apiSuccess({
    quotes: rows.map(quoteRowToClient),
  })
}, { requireAuth: true })

export const POST = withApiHandler(async (_req: NextRequest, { auth }) => {
  const { org } = auth
  const now = new Date()
  const due = new Date(now)
  due.setDate(due.getDate() + 15)

  const quoteNumber = await nextQuoteNumber(org.id)
  const [row] = await db
    .insert(quotes)
    .values({
      organizationId: org.id,
      quoteNumber,
      status: 'draft',
      issueDate: now,
      dueDate: due,
      lineItems: [newQuoteLineItem({ itemLabel: 'Servicio', quantity: 1 })],
      notes: null,
      globalDiscountPercent: 0,
      updatedAt: now,
    })
    .returning()

  return apiCreated({ quote: quoteRowToClient(row) })
}, { requireAuth: true })
