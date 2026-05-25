import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { loadSupportValueReportPreview, listRecentReportMonths, parseReportMonth } from '@/lib/support-value-report'
import { withApiHandler } from '@/lib/with-api-handler'

const Query = z.object({
  month: z.string().max(7).optional(),
  clientCompany: z.string().max(200).optional(),
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

  const clientCompany = parsed.data.clientCompany?.trim() || null

  const preview = await loadSupportValueReportPreview({
    organizationId: auth.org.id,
    month,
    clientCompany,
  })

  if (!preview) {
    throw new ValidationError('Mes inválido')
  }

  const companiesInPeriod = await loadSupportValueReportPreview({
    organizationId: auth.org.id,
    month,
  })

  const companyOptions = (companiesInPeriod?.companies ?? []).map((c) => c.clientCompany)

  return apiSuccess({
    preview,
    monthOptions: listRecentReportMonths(18),
    companyOptions,
  })
}, { requireAuth: true })
