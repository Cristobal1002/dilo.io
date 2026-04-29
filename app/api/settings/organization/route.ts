import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { rethrowUnlessMissingRelation } from '@/lib/pg-relation-errors'
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

const PatchBody = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    logoUrl: optionalHttpsUrl,
    websiteUrl: optionalHttpsUrl,
    outreachColdEmailBodyMarkdown: optionalOutreachMarkdown,
    outreachColdEmailCtaLabel: optionalOutreachCtaLabel,
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.logoUrl !== undefined ||
      d.websiteUrl !== undefined ||
      d.outreachColdEmailBodyMarkdown !== undefined ||
      d.outreachColdEmailCtaLabel !== undefined,
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
  })
}, { requireAuth: true })

export const PATCH = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  const body = await req.json()
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const { name, logoUrl, websiteUrl, outreachColdEmailBodyMarkdown, outreachColdEmailCtaLabel } =
    parsed.data
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
  })
}, { requireAuth: true })
