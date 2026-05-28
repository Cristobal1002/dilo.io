import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { quotes } from '@/db/schema'
import { getAuthContext } from '@/lib/auth'
import { dashboardPageClass } from '@/lib/dashboard-page-layout'
import { QUOTE_STATUS_LABEL, type QuoteStatus } from '@/lib/quotes'
import { formatQuoteMoney, calculateQuoteTotals, parseQuoteLineItems } from '@/lib/quotes'

export default async function QuotesPage() {
  const auth = await getAuthContext()
  const rows = await db.query.quotes.findMany({
    where: eq(quotes.organizationId, auth.org.id),
    orderBy: [desc(quotes.updatedAt)],
    limit: 50,
  })

  const prefix = auth.org.quotePrefix?.trim() || 'COT'

  return (
    <div className={dashboardPageClass}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Comercial</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Cotizaciones</h1>
          <p className="mt-1 max-w-xl text-sm text-[#64748B]">
            Crea cotizaciones en blanco o genera una desde las respuestas de un flow con IA. Configura NIT,
            dirección y logo en{' '}
            <Link href="/dashboard/account?tab=organization" className="font-semibold text-[#6B4DD4] hover:underline">
              Mi cuenta → Organización
            </Link>
            .
          </p>
        </div>
        <Link
          href="/dashboard/quotes/new"
          className="inline-block rounded-xl bg-[#9C77F5] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Nueva cotización
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E8EAEF] text-[10px] font-semibold uppercase text-[#94A3B8] dark:border-[#2A2F3F]">
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Actualizada</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                  Aún no hay cotizaciones. Crea una nueva o genera desde Resultados de un flow.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const items = parseQuoteLineItems(row.lineItems)
                const total = calculateQuoteTotals(
                  items,
                  Number(row.globalDiscountPercent) || 0,
                ).total
                const status = row.status as QuoteStatus
                return (
                  <tr
                    key={row.id}
                    className="border-b border-[#E8EAEF]/60 hover:bg-[#FAFBFC] dark:border-[#2A2F3F]/60 dark:hover:bg-[#161821]"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/dashboard/quotes/${row.id}`}
                        className="text-[#6B4DD4] hover:underline dark:text-[#D4C4FC]"
                      >
                        {prefix}-{row.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.clientName ?? '—'}</td>
                    <td className="px-4 py-3">
                      {QUOTE_STATUS_LABEL[status] ?? row.status}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatQuoteMoney(total)}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {row.updatedAt
                        ? new Intl.DateTimeFormat('es', { dateStyle: 'short' }).format(
                            new Date(row.updatedAt),
                          )
                        : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
