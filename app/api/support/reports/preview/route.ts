import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import {
  loadSupportValueReportPreview,
  loadSupportValueReportTrend,
  listRecentReportMonths,
  parseReportMonth,
} from '@/lib/support-value-report'
import { withApiHandler } from '@/lib/with-api-handler'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { eq } from 'drizzle-orm'

const Query = z.object({
  month: z.string().max(7).optional(),
  clientId: z.string().uuid().optional(),
})

export const GET = withApiHandler(async (req: NextRequest, { auth }) => {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = Query.safeParse(raw)
  if (!parsed.success) {
    throw new ValidationError('Parámetros inválidos', parsed.error.flatten().fieldErrors)
  }

  const now = new Date()
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const month = parsed.data.month?.trim() || defaultMonth
  if (!parseReportMonth(month)) {
    throw new ValidationError('Mes inválido (usa formato YYYY-MM)')
  }

  const clientId = parsed.data.clientId?.trim() || null

  const preview = await loadSupportValueReportPreview({
    organizationId: auth.org.id,
    month,
    clientId,
  })

  if (!preview) {
    throw new ValidationError('Mes inválido')
  }

  const trend = await loadSupportValueReportTrend({
    organizationId: auth.org.id,
    month,
    monthsBack: 3,
    clientId,
  })

  if (!trend) {
    throw new ValidationError('No se pudo cargar la tendencia')
  }

  // Options: lista de clientes canónicos (tabla clients) + fallback por casos sin clientId si existieran.
  const rows = await db.query.clients.findMany({
    where: eq(clients.organizationId, auth.org.id),
    columns: { id: true, name: true },
    orderBy: (t, { asc }) => [asc(t.name)],
  })
  const companyOptions = rows.map((c) => ({ id: c.id, name: c.name }))

  return apiSuccess({
    preview,
    trend,
    monthOptions: listRecentReportMonths(18),
    companyOptions,
  })
}, { requireAuth: true })
