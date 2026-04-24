import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import {
  normalizeEmailNotificationSettings,
  patchEmailNotificationSettingsSchema,
} from '@/lib/email-notification-settings'
import { ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import { withApiHandler } from '@/lib/with-api-handler'

const log = createLogger('settings/notifications')

export const GET = withApiHandler(
  async (_req: NextRequest, { auth }) => {
    const { userId } = auth
    const row = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: {
        emailNotificationSettings: true,
        lastDigestSentAt: true,
      },
    })
    const settings = normalizeEmailNotificationSettings(row?.emailNotificationSettings)
    return apiSuccess({
      settings,
      lastDigestSentAt: row?.lastDigestSentAt?.toISOString() ?? null,
    })
  },
  { requireAuth: true },
)

export const PATCH = withApiHandler(
  async (req: NextRequest, { auth }) => {
    const { userId } = auth
    const body = await req.json()
    const parsed = patchEmailNotificationSettingsSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
    }

    const current = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: { emailNotificationSettings: true },
    })
    const merged = normalizeEmailNotificationSettings({
      ...normalizeEmailNotificationSettings(current?.emailNotificationSettings),
      ...parsed.data,
    })

    await db.update(users).set({ emailNotificationSettings: merged }).where(eq(users.clerkId, userId))

    log.info({ userId }, 'Notification settings updated')
    return apiSuccess({ settings: merged })
  },
  { requireAuth: true },
)
