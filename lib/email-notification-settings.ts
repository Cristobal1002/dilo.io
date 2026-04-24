import { z } from 'zod'

export const digestEnum = z.enum(['off', 'daily', 'weekly'])

export const emailNotificationSettingsSchema = z.object({
  digest: digestEnum.default('weekly'),
  alertHot: z.boolean().default(false),
  alertMinScore: z.number().int().min(0).max(100).nullable().default(null),
  alertMaxPerDay: z.number().int().min(0).max(50).default(3),
})

export type EmailNotificationSettings = z.infer<typeof emailNotificationSettingsSchema>

export const defaultEmailNotificationSettings: EmailNotificationSettings = {
  digest: 'weekly',
  alertHot: false,
  alertMinScore: null,
  alertMaxPerDay: 3,
}

export const notificationStatsSchema = z.object({
  hotDay: z.string().optional(),
  hotCount: z.number().int().min(0).optional(),
})

export type NotificationStats = z.infer<typeof notificationStatsSchema>

export function normalizeEmailNotificationSettings(raw: unknown): EmailNotificationSettings {
  const base =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return emailNotificationSettingsSchema.parse({
    digest: base.digest ?? defaultEmailNotificationSettings.digest,
    alertHot: base.alertHot ?? defaultEmailNotificationSettings.alertHot,
    alertMinScore:
      base.alertMinScore === undefined
        ? defaultEmailNotificationSettings.alertMinScore
        : base.alertMinScore,
    alertMaxPerDay: base.alertMaxPerDay ?? defaultEmailNotificationSettings.alertMaxPerDay,
  })
}

export const patchEmailNotificationSettingsSchema = emailNotificationSettingsSchema.partial()

export function isDigestDue(
  digest: EmailNotificationSettings['digest'],
  lastDigestSentAt: Date | null | undefined,
  now: Date,
): boolean {
  if (digest === 'off') return false
  if (!lastDigestSentAt) return true
  if (digest === 'daily') {
    return utcDayString(lastDigestSentAt) !== utcDayString(now)
  }
  return now.getTime() - lastDigestSentAt.getTime() >= 7 * 24 * 60 * 60 * 1000
}

export function utcDayString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function shouldSendInstantLeadAlert(
  settings: EmailNotificationSettings,
  classification: string | null,
  score: number | null,
): boolean {
  if (settings.alertMaxPerDay <= 0) return false
  if (settings.alertHot && classification === 'hot') return true
  if (
    settings.alertMinScore != null &&
    score != null &&
    Number.isFinite(score) &&
    score >= settings.alertMinScore
  ) {
    return true
  }
  return false
}

export function normalizeNotificationStats(raw: unknown): NotificationStats {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return notificationStatsSchema.parse({
    hotDay: typeof o.hotDay === 'string' ? o.hotDay : undefined,
    hotCount: typeof o.hotCount === 'number' && Number.isFinite(o.hotCount) ? o.hotCount : undefined,
  })
}

export function canSendHotAlertToday(
  stats: NotificationStats,
  todayUtc: string,
  maxPerDay: number,
): { ok: boolean; nextStats: NotificationStats } {
  const day = stats.hotDay
  const count = stats.hotCount ?? 0
  if (day !== todayUtc) {
    return { ok: maxPerDay > 0, nextStats: { hotDay: todayUtc, hotCount: 1 } }
  }
  if (count >= maxPerDay) {
    return { ok: false, nextStats: stats }
  }
  return { ok: true, nextStats: { hotDay: todayUtc, hotCount: count + 1 } }
}
