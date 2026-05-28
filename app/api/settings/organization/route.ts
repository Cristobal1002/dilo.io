import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { rethrowUnlessMissingRelation } from '@/lib/pg-relation-errors'
import { isUploadthingConfigured } from '@/lib/uploadthing-config'
import { withApiHandler } from '@/lib/with-api-handler'

const ORG_TABLE = 'organizations'

function isHttpsUrl(s: string): boolean {
  return /^https:\/\//i.test(s.trim())
}

const optionalHttpsUrl = z
  .union([z.string().max(2048), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined
    if (v === null) return null
    const t = v.trim()
    return t === '' ? null : t
  })
  .refine((v) => v === undefined || v === null || isHttpsUrl(v), {
    message: 'Debe ser una URL vacía o que empiece con https://',
  })

const optionalOutreachMarkdown = z
  .union([z.string().max(12000), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined
    if (v === null) return null
    const t = v.trim()
    return t === '' ? null : t
  })

const optionalOutreachCtaLabel = z
  .union([z.string().max(80), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined
    if (v === null) return null
    const t = v.trim()
    return t === '' ? null : t
  })

const optionalText = (max: number) =>
  z
    .union([z.string().max(max), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined
      if (v === null) return null
      const t = v.trim()
      return t === '' ? null : t
    })

const optionalSupportContractPrompt = z
  .union([z.string().max(12000), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined
    if (v === null) return null
    const t = v.trim()
    return t === '' ? null : t
  })

const optionalHourlyRate = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined
    if (v === null || v === '') return null
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n) || n < 0) return Number.NaN
    return Math.round(n * 100) / 100
  })
  .pipe(z.number().min(0).max(99999).nullable().optional())

const PatchBody = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    logoUrl: optionalHttpsUrl,
    websiteUrl: optionalHttpsUrl,
    outreachColdEmailBodyMarkdown: optionalOutreachMarkdown,
    outreachColdEmailCtaLabel: optionalOutreachCtaLabel,
    supportContractPrompt: optionalSupportContractPrompt,
    supportHourlyRateUsd: optionalHourlyRate,
    legalName: optionalText(300),
    taxId: optionalText(80),
    billingEmail: optionalText(320),
    billingPhone: optionalText(80),
    billingAddress: optionalText(500),
    billingCity: optionalText(120),
    quotePrefix: optionalText(20),
  })
  .refine(
    (d) =>
      Object.values(d).some((v) => v !== undefined),
    { message: 'Envía al menos un campo para actualizar' },
  )

export const GET = withApiHandler(async (_req: NextRequest, { auth }) => {
  const { org } = auth
  return apiSuccess({
    name: org.name,
    logoUrl: org.logoUrl ?? null,
    websiteUrl: org.websiteUrl ?? null,
    outreachColdEmailBodyMarkdown: org.outreachColdEmailBodyMarkdown ?? null,
    outreachColdEmailCtaLabel: org.outreachColdEmailCtaLabel ?? null,
    supportContractPrompt: org.supportContractPrompt ?? null,
    supportHourlyRateUsd: org.supportHourlyRateUsd ?? null,
    legalName: org.legalName ?? null,
    taxId: org.taxId ?? null,
    billingEmail: org.billingEmail ?? null,
    billingPhone: org.billingPhone ?? null,
    billingAddress: org.billingAddress ?? null,
    billingCity: org.billingCity ?? null,
    quotePrefix: org.quotePrefix ?? 'COT',
    logoUploadConfigured: isUploadthingConfigured(),
  })
}, { requireAuth: true })

export const PATCH = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  const body = await req.json()
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const {
    name,
    logoUrl,
    websiteUrl,
    outreachColdEmailBodyMarkdown,
    outreachColdEmailCtaLabel,
    supportContractPrompt,
    supportHourlyRateUsd,
    legalName,
    taxId,
    billingEmail,
    billingPhone,
    billingAddress,
    billingCity,
    quotePrefix,
  } = parsed.data
  const patch: Partial<typeof organizations.$inferInsert> = {}
  if (name !== undefined) patch.name = name
  if (logoUrl !== undefined) patch.logoUrl = logoUrl
  if (websiteUrl !== undefined) patch.websiteUrl = websiteUrl
  if (outreachColdEmailBodyMarkdown !== undefined) {
    patch.outreachColdEmailBodyMarkdown = outreachColdEmailBodyMarkdown
  }
  if (outreachColdEmailCtaLabel !== undefined) {
    patch.outreachColdEmailCtaLabel = outreachColdEmailCtaLabel
  }
  if (supportContractPrompt !== undefined) {
    patch.supportContractPrompt = supportContractPrompt
  }
  if (supportHourlyRateUsd !== undefined) {
    patch.supportHourlyRateUsd = supportHourlyRateUsd
  }
  if (legalName !== undefined) patch.legalName = legalName
  if (taxId !== undefined) patch.taxId = taxId
  if (billingEmail !== undefined) patch.billingEmail = billingEmail
  if (billingPhone !== undefined) patch.billingPhone = billingPhone
  if (billingAddress !== undefined) patch.billingAddress = billingAddress
  if (billingCity !== undefined) patch.billingCity = billingCity
  if (quotePrefix !== undefined) patch.quotePrefix = quotePrefix ?? 'COT'

  try {
    await db.update(organizations).set(patch).where(eq(organizations.id, auth.org.id))
  } catch (err) {
    rethrowUnlessMissingRelation(err, ORG_TABLE)
  }

  const [row] = await db
    .select({
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      websiteUrl: organizations.websiteUrl,
      outreachColdEmailBodyMarkdown: organizations.outreachColdEmailBodyMarkdown,
      outreachColdEmailCtaLabel: organizations.outreachColdEmailCtaLabel,
      supportContractPrompt: organizations.supportContractPrompt,
      supportHourlyRateUsd: organizations.supportHourlyRateUsd,
      legalName: organizations.legalName,
      taxId: organizations.taxId,
      billingEmail: organizations.billingEmail,
      billingPhone: organizations.billingPhone,
      billingAddress: organizations.billingAddress,
      billingCity: organizations.billingCity,
      quotePrefix: organizations.quotePrefix,
    })
    .from(organizations)
    .where(eq(organizations.id, auth.org.id))
    .limit(1)

  return apiSuccess({
    name: row?.name ?? auth.org.name,
    logoUrl: row?.logoUrl ?? null,
    websiteUrl: row?.websiteUrl ?? null,
    outreachColdEmailBodyMarkdown: row?.outreachColdEmailBodyMarkdown ?? null,
    outreachColdEmailCtaLabel: row?.outreachColdEmailCtaLabel ?? null,
    supportContractPrompt: row?.supportContractPrompt ?? null,
    supportHourlyRateUsd: row?.supportHourlyRateUsd ?? null,
    legalName: row?.legalName ?? null,
    taxId: row?.taxId ?? null,
    billingEmail: row?.billingEmail ?? null,
    billingPhone: row?.billingPhone ?? null,
    billingAddress: row?.billingAddress ?? null,
    billingCity: row?.billingCity ?? null,
    quotePrefix: row?.quotePrefix ?? 'COT',
  })
}, { requireAuth: true })
