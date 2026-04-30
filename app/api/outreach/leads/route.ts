import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { outreachLeads } from '@/db/schema'
import { apiCreated, apiSuccess } from '@/lib/api-response'
import { ConflictError, ValidationError } from '@/lib/errors'
import { loadOutreachLeadsPage } from '@/lib/outreach-leads-page'
import { normalizeLeadEmailKey, OUTREACH_FILTER_STATUSES } from '@/lib/outreach'
import { withApiHandler } from '@/lib/with-api-handler'

const CreateBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  company: z.string().trim().max(200).optional().nullable(),
  role: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
})

const ListQuery = z.object({
  status: z.enum(OUTREACH_FILTER_STATUSES).optional().default('all'),
  q: z.string().max(200).optional(),
  flowId: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim()
      if (!t) return undefined
      const r = z.string().uuid().safeParse(t)
      return r.success ? r.data : undefined
    }),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
})

export const GET = withApiHandler(async (req: NextRequest, { auth }) => {
  const { org } = auth
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = ListQuery.safeParse(raw)
  if (!parsed.success) {
    throw new ValidationError('Parámetros inválidos', parsed.error.flatten().fieldErrors)
  }
  const { status, q, flowId, page, pageSize } = parsed.data

  const result = await loadOutreachLeadsPage({
    organizationId: org.id,
    status,
    q: q?.trim() || null,
    flowId: flowId ?? null,
    page,
    pageSize,
  })

  return apiSuccess(result)
}, { requireAuth: true })

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  const { org } = auth
  const body = await req.json()
  const parsed = CreateBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const emailKey = normalizeLeadEmailKey(parsed.data.email)
  const now = new Date()

  try {
    const [row] = await db
      .insert(outreachLeads)
      .values({
        organizationId: org.id,
        name: parsed.data.name,
        email: parsed.data.email.trim(),
        emailKey,
        company: parsed.data.company?.trim() || null,
        role: parsed.data.role?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        lastActivityAt: now,
        updatedAt: now,
      })
      .returning()
    return apiCreated({ lead: row })
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
    if (code === '23505') {
      throw new ConflictError('Ya existe un lead activo con ese email')
    }
    throw e
  }
}, { requireAuth: true })
