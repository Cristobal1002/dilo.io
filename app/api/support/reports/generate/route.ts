import { NextRequest } from 'next/server'
import { z } from 'zod'
import { generateText } from 'ai'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { assertGenerativeAiConfigured, getStructuredOutputModel } from '@/lib/ai-model'
import {
  buildSupportValueReportUserPrompt,
  SUPPORT_VALUE_REPORT_SYSTEM,
} from '@/lib/prompts/support-value-report'
import { loadSupportValueReportPreview, parseReportMonth } from '@/lib/support-value-report'
import { withApiHandler } from '@/lib/with-api-handler'

const Body = z.object({
  month: z.string().max(7),
  clientCompany: z.string().max(200).nullable().optional(),
})

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  const body = await req.json()
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const month = parsed.data.month.trim()
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
    throw new ValidationError('No se pudo cargar el periodo')
  }

  if (preview.totalCases === 0) {
    throw new ValidationError(
      'No hay casos cerrados o resueltos con horas registradas en ese mes. Registra horas en la bandeja de Soporte.',
    )
  }

  const orgRow = await db.query.organizations.findFirst({
    where: eq(organizations.id, auth.org.id),
    columns: { name: true, supportContractPrompt: true },
  })

  const contractPrompt = orgRow?.supportContractPrompt ?? null

  if (!preview.hasContractPrompt && preview.hourlyRateUsd == null) {
    throw new ValidationError(
      'Configura el prompt de contrato o la tarifa USD/h en Mi cuenta → Organización antes de generar el informe.',
    )
  }

  assertGenerativeAiConfigured()

  const { text } = await generateText({
    model: getStructuredOutputModel(),
    system: SUPPORT_VALUE_REPORT_SYSTEM,
    prompt: buildSupportValueReportUserPrompt({
      organizationName: orgRow?.name ?? 'Tu proveedor',
      preview,
      contractPrompt,
      clientCompany,
    }),
    maxOutputTokens: 2000,
  })

  const narrativeMarkdown = text.trim()

  return apiSuccess({
    preview,
    narrativeMarkdown,
    clientCompany,
  })
}, { requireAuth: true })
