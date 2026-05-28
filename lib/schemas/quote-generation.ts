import { z } from 'zod'

export const QuoteLineItemAiSchema = z.object({
  item_label: z.string(),
  reference: z.string().nullable(),
  unit_price: z.number().nullable(),
  discount_percent: z.number().nullable(),
  tax_percent: z.number().nullable(),
  description: z.string().nullable(),
  quantity: z.number().nullable(),
})

export const QuoteGenerationSchema = z.object({
  client_name: z.string().nullable(),
  client_tax_id: z.string().nullable(),
  client_phone: z.string().nullable(),
  client_email: z.string().nullable(),
  notes: z.string().nullable(),
  global_discount_percent: z.number().nullable(),
  line_items: z.array(QuoteLineItemAiSchema),
})

export type QuoteGenerationResult = z.infer<typeof QuoteGenerationSchema>
