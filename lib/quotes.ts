import { randomUUID } from 'crypto'

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'cancelled'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export type QuoteLineItem = {
  id: string
  itemLabel: string
  reference: string
  unitPrice: number
  discountPercent: number
  taxPercent: number
  description: string
  quantity: number
}

export type QuoteTotals = {
  subtotal: number
  lineDiscount: number
  afterLineDiscount: number
  globalDiscount: number
  afterGlobalDiscount: number
  tax: number
  total: number
}

export function newQuoteLineItem(partial?: Partial<QuoteLineItem>): QuoteLineItem {
  return {
    id: randomUUID(),
    itemLabel: '',
    reference: '',
    unitPrice: 0,
    discountPercent: 0,
    taxPercent: 0,
    description: '',
    quantity: 1,
    ...partial,
  }
}

export function lineItemTotal(item: QuoteLineItem): number {
  const base = item.unitPrice * item.quantity
  const afterDisc = base * (1 - Math.min(100, Math.max(0, item.discountPercent)) / 100)
  const afterTax = afterDisc * (1 + Math.min(100, Math.max(0, item.taxPercent)) / 100)
  return roundMoney(afterTax)
}

export function calculateQuoteTotals(
  items: QuoteLineItem[],
  globalDiscountPercent: number,
): QuoteTotals {
  let subtotal = 0
  let afterLineDiscount = 0
  let tax = 0

  for (const item of items) {
    const base = item.unitPrice * item.quantity
    subtotal += base
    const disc = base * (Math.min(100, Math.max(0, item.discountPercent)) / 100)
    const net = base - disc
    afterLineDiscount += net
    tax += net * (Math.min(100, Math.max(0, item.taxPercent)) / 100)
  }

  const lineDiscount = subtotal - afterLineDiscount
  const globalDisc =
    afterLineDiscount * (Math.min(100, Math.max(0, globalDiscountPercent)) / 100)
  const afterGlobalDiscount = afterLineDiscount - globalDisc
  const taxScaled =
    afterLineDiscount > 0 ? tax * (afterGlobalDiscount / afterLineDiscount) : 0
  const total = afterGlobalDiscount + taxScaled

  return {
    subtotal: roundMoney(subtotal),
    lineDiscount: roundMoney(lineDiscount),
    afterLineDiscount: roundMoney(afterLineDiscount),
    globalDiscount: roundMoney(globalDisc),
    afterGlobalDiscount: roundMoney(afterGlobalDiscount),
    tax: roundMoney(taxScaled),
    total: roundMoney(total),
  }
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatQuoteMoney(amount: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function parseQuoteLineItems(raw: unknown): QuoteLineItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const o = row as Record<string, unknown>
      return newQuoteLineItem({
        id: typeof o.id === 'string' ? o.id : randomUUID(),
        itemLabel: String(o.itemLabel ?? o.item_label ?? ''),
        reference: String(o.reference ?? ''),
        unitPrice: Number(o.unitPrice ?? o.unit_price ?? 0) || 0,
        discountPercent: Number(o.discountPercent ?? o.discount_percent ?? 0) || 0,
        taxPercent: Number(o.taxPercent ?? o.tax_percent ?? 0) || 0,
        description: String(o.description ?? ''),
        quantity: Math.max(0, Number(o.quantity ?? 1) || 1),
      })
    })
    .filter(Boolean) as QuoteLineItem[]
}

export function isQuoteStatus(s: string): s is QuoteStatus {
  return QUOTE_STATUSES.includes(s as QuoteStatus)
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  cancelled: 'Cancelada',
}
