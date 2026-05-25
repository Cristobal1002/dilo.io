import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUserInOrg } from '@/lib/auth'
import { apiSuccess } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'
import { ValidationError } from '@/lib/errors'
import { loadSupportCasesPage } from '@/lib/support-cases-page'
import {
  SUPPORT_ASSIGNEE_FILTERS,
  SUPPORT_FILTER_STATUSES,
} from '@/lib/support'
import { withApiHandler } from '@/lib/with-api-handler'

const ListQuery = z.object({
  status: z.enum(SUPPORT_FILTER_STATUSES).optional().default('all'),
  assignee: z.enum(SUPPORT_ASSIGNEE_FILTERS).optional().default('all'),
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
  const dbUser = await getAuthUserInOrg(auth)
  if (!dbUser) throw new UnauthorizedError()

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = ListQuery.safeParse(raw)
  if (!parsed.success) {
    throw new ValidationError('Parámetros inválidos', parsed.error.flatten().fieldErrors)
  }

  const result = await loadSupportCasesPage({
    organizationId: org.id,
    status: parsed.data.status,
    assignee: parsed.data.assignee,
    q: parsed.data.q?.trim() || null,
    flowId: parsed.data.flowId ?? null,
    currentUserId: dbUser.id,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  })

  return apiSuccess(result)
}, { requireAuth: true })
