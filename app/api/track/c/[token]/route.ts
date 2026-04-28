import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { outreachEmails, outreachLeads } from '@/db/schema'
import { autoStatusAfterClick, isAllowedTrackingRedirectUrl, publicAppBaseUrl } from '@/lib/outreach'
import { withApiHandler } from '@/lib/with-api-handler'
import { createLogger } from '@/lib/logger'

const log = createLogger('track/click')

export const GET = withApiHandler(
  async (req: NextRequest, { params }) => {
    const token = params.token?.trim() ?? ''
    const rawUrl = req.nextUrl.searchParams.get('url') ?? ''
    let destination: string
    try {
      destination = decodeURIComponent(rawUrl)
    } catch {
      destination = ''
    }

    const fallback = publicAppBaseUrl()
    if (!token || !destination || !isAllowedTrackingRedirectUrl(destination)) {
      return NextResponse.redirect(fallback, 302)
    }

    const row = await db.query.outreachEmails.findFirst({
      where: eq(outreachEmails.trackingToken, token),
      columns: {
        id: true,
        leadId: true,
        clickCount: true,
        firstClickedAt: true,
      },
    })

    if (!row) {
      return NextResponse.redirect(destination, 302)
    }

    const now = new Date()
    const urlTrim = destination.slice(0, 2000)
    await db
      .update(outreachEmails)
      .set({
        clickCount: row.clickCount + 1,
        firstClickedAt: row.firstClickedAt ?? now,
        lastClickedUrl: urlTrim,
      })
      .where(eq(outreachEmails.id, row.id))

    const lead = await db.query.outreachLeads.findFirst({
      where: eq(outreachLeads.id, row.leadId),
      columns: { id: true, status: true, deletedAt: true },
    })
    if (lead && !lead.deletedAt) {
      const nextStatus = autoStatusAfterClick(lead.status)
      if (nextStatus) {
        await db
          .update(outreachLeads)
          .set({
            status: nextStatus,
            lastActivityAt: now,
            updatedAt: now,
          })
          .where(eq(outreachLeads.id, lead.id))
      } else {
        await db
          .update(outreachLeads)
          .set({ lastActivityAt: now, updatedAt: now })
          .where(eq(outreachLeads.id, lead.id))
      }
    }

    log.debug({ emailId: row.id, leadId: row.leadId }, 'Click redirect')
    return NextResponse.redirect(destination, 302)
  },
  { requireAuth: false },
)
