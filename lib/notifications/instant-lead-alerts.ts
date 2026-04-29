import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { sendHotLeadAlertEmail } from '@/lib/email/send-hot-lead-alert'
import { createLogger } from '@/lib/logger'
import {
  normalizeEmailNotificationSettings,
  normalizeNotificationStats,
  shouldSendInstantLeadAlert,
  canSendHotAlertToday,
  utcDayString,
} from '@/lib/email-notification-settings'

const log = createLogger('notifications/instant')

type Contact = { name?: string; email?: string; phone?: string }

export async function notifyOrgUsersInstantLeadAlerts(args: {
  organizationId: string
  flowName: string
  flowId: string
  sessionId: string
  classification: string | null
  score: number | null
  summary: string | null
  suggestedAction: string | null
  contact: Contact
}): Promise<void> {
  const members = await db.query.users.findMany({
    where: eq(users.organizationId, args.organizationId),
    columns: {
      id: true,
      email: true,
      emailNotificationSettings: true,
      notificationStats: true,
    },
  })

  const today = utcDayString(new Date())

  for (const u of members) {
    if (!u.email) continue
    const settings = normalizeEmailNotificationSettings(u.emailNotificationSettings)
    if (!shouldSendInstantLeadAlert(settings, args.classification, args.score)) continue

    const stats = normalizeNotificationStats(u.notificationStats)
    const { ok, nextStats } = canSendHotAlertToday(stats, today, settings.alertMaxPerDay)
    if (!ok) continue

    void sendHotLeadAlertEmail({
      organizationId: args.organizationId,
      toEmail: u.email,
      flowName: args.flowName,
      flowId: args.flowId,
      sessionId: args.sessionId,
      summary: args.summary,
      score: args.score,
      classification: args.classification,
      suggestedAction: args.suggestedAction,
      contact: args.contact,
    })
      .then(async () => {
        await db.update(users).set({ notificationStats: nextStats }).where(eq(users.id, u.id))
      })
      .catch((err) => {
        log.error({ err, sessionId: args.sessionId, userId: u.id }, 'sendHotLeadAlertEmail failed')
      })
  }
}
