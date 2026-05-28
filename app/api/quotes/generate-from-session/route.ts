import { NextRequest } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, quotes } from '@/db/schema'
import { apiCreated } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import {
  assertGenerativeAiConfigured,
  getStructuredModelProviderChain,
  getStructuredOutputModelForProvider,
} from '@/lib/ai-model'
import { QuoteGenerationSchema } from '@/lib/schemas/quote-generation'
import { buildQuoteGeneratorPrompt, QUOTE_GENERATOR_SYSTEM } from '@/lib/prompts/generate-quote'
import { loadSessionQuoteContext } from '@/lib/quotes-from-session'
import { mapAiToLineItems, nextQuoteNumber, quoteRowToClient } from '@/lib/quotes-db'
import { withApiHandler } from '@/lib/with-api-handler'

export const maxDuration = 60

const Body = z.object({
  flowId: z.string().uuid(),
  sessionId: z.string().uuid(),
  userPrompt: z.string().max(12000).optional().nullable(),
})

function pickContact(
  contact: Record<string, string | null>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = contact[k]?.trim()
    if (v) return v
  }
  return null
}

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  const { org } = auth
  assertGenerativeAiConfigured()

  const body = await req.json()
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, parsed.data.flowId), eq(flows.organizationId, org.id)),
    columns: { id: true },
  })
  if (!flow) throw new NotFoundError('Flow')

  const ctx = await loadSessionQuoteContext(org.id, parsed.data.flowId, parsed.data.sessionId)
  if (!ctx) {
    throw new ValidationError('La sesión no existe o no está completada.')
  }

  const quotePrompt = parsed.data.userPrompt?.trim() || null

  const prompt = buildQuoteGeneratorPrompt({
    sessionContext: ctx,
    quotePrompt,
    hourlyRateUsd: org.supportHourlyRateUsd ?? null,
  })

  let object: z.infer<typeof QuoteGenerationSchema> | null = null
  const providers = getStructuredModelProviderChain()
  for (const provider of providers) {
    try {
      const result = await generateObject({
        model: getStructuredOutputModelForProvider(provider),
        schema: QuoteGenerationSchema,
        system: QUOTE_GENERATOR_SYSTEM,
        prompt,
      })
      object = result.object
      break
    } catch {
      /* try next */
    }
  }
  if (!object) {
    throw new ValidationError('No se pudo generar la cotización con IA. Intenta de nuevo.')
  }

  const lineItems = mapAiToLineItems(object)
  if (lineItems.length === 0) {
    throw new ValidationError('La IA no generó líneas de cotización.')
  }

  const now = new Date()
  const due = new Date(now)
  due.setDate(due.getDate() + 15)

  const clientName =
    object.client_name?.trim() ||
    pickContact(ctx.contact, ['fullName', 'name', 'nombre', 'firstName']) ||
    null
  const clientEmail = object.client_email?.trim() || pickContact(ctx.contact, ['email']) || null
  const clientPhone = object.client_phone?.trim() || pickContact(ctx.contact, ['phone', 'telefono']) || null

  const quoteNumber = await nextQuoteNumber(org.id)
  const [row] = await db
    .insert(quotes)
    .values({
      organizationId: org.id,
      quoteNumber,
      status: 'draft',
      flowId: parsed.data.flowId,
      sessionId: parsed.data.sessionId,
      clientName,
      clientTaxId: object.client_tax_id?.trim() || null,
      clientPhone,
      clientEmail,
      issueDate: now,
      dueDate: due,
      lineItems,
      aiPrompt: quotePrompt,
      notes: object.notes?.trim() || null,
      globalDiscountPercent: object.global_discount_percent ?? 0,
      updatedAt: now,
    })
    .returning()

  return apiCreated({ quote: quoteRowToClient(row) })
}, { requireAuth: true })
