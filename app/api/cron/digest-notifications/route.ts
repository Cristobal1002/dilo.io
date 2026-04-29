import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, gte, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { flows, results, sessions, users } from '@/db/schema'
import { sendSessionsDigestEmail } from '@/lib/email/send-digest'
import {
  isDigestDue,
  normalizeEmailNotificationSettings,
} from '@/lib/email-notification-settings'
import { createLogger } from '@/lib/logger'

const log = createLogger('cron/digest-notifications')

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let processed = 0
  let sent = 0
  let errors = 0

  const allUsers = await db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      organizationId: true,
      emailNotificationSettings: true,
      lastDigestSentAt: true,
    },
  })

  for (const user of allUsers) {
    const settings = normalizeEmailNotificationSettings(user.emailNotificationSettings)
    if (settings.digest === 'off') continue
    if (!isDigestDue(settings.digest, user.lastDigestSentAt ?? null, now)) continue

    processed += 1

    const fallbackMs = settings.digest === 'daily' ? 86400000 : 7 * 86400000
    const since = user.lastDigestSentAt ?? new Date(now.getTime() - fallbackMs)

    try {
      const rows = await db
        .select({
          sessionId: sessions.id,
          completedAt: sessions.completedAt,
          flowName: flows.name,
          flowId: flows.id,
          classification: results.classification,
          score: results.score,
        })
        .from(sessions)
        .innerJoin(flows, eq(sessions.flowId, flows.id))
        .innerJoin(results, eq(results.sessionId, sessions.id))
        .where(
          and(
            eq(flows.organizationId, user.organizationId),
            eq(sessions.status, 'completed'),
            isNotNull(sessions.completedAt),
            gte(sessions.completedAt, since),
          ),
        )
        .orderBy(desc(sessions.completedAt))
        .limit(100)

      const periodDescription = `${since.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`
      const digestLabel = settings.digest === 'daily' ? 'daily' : 'weekly'

      if (user.email && rows.length > 0) {
        await sendSessionsDigestEmail({
          organizationId: user.organizationId,
          toEmail: user.email,
          digestLabel,
          periodDescription,
          lines: rows.map((r) => ({
            flowName: r.flowName,
            sessionId: r.sessionId,
            flowId: r.flowId,
            completedAt: r.completedAt!.toISOString(),
            classification: r.classification,
            score: r.score,
          })),
        })
        sent += 1
      }

      await db.update(users).set({ lastDigestSentAt: now }).where(eq(users.id, user.id))
    } catch (e) {
      errors += 1
      log.error({ err: String(e), userId: user.id }, 'Digest job failed for user')
    }
  }

  log.info({ processed, sent, errors, users: allUsers.length }, 'Digest cron finished')
  return NextResponse.json({ ok: true, processed, sent, errors })
}
