import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { outreachEmails, outreachLeads } from '@/db/schema'
import { autoStatusAfterOpen } from '@/lib/outreach'
import { withApiHandler } from '@/lib/with-api-handler'
import { createLogger } from '@/lib/logger'

const log = createLogger('track/open')

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
)

function pixelResponse(): NextResponse {
  return new NextResponse(new Uint8Array(PIXEL), {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    },
  })
}

export const GET = withApiHandler(
  async (_req: NextRequest, { params }) => {
    const token = params.token?.trim() ?? ''
    if (!token) return pixelResponse()

    const row = await db.query.outreachEmails.findFirst({
      where: eq(outreachEmails.trackingToken, token),
      columns: {
        id: true,
        leadId: true,
        openCount: true,
        firstOpenedAt: true,
      },
    })

    if (!row) return pixelResponse()

    const now = new Date()
    await db
      .update(outreachEmails)
      .set({
        openCount: row.openCount + 1,
        firstOpenedAt: row.firstOpenedAt ?? now,
      })
      .where(eq(outreachEmails.id, row.id))

    const lead = await db.query.outreachLeads.findFirst({
      where: eq(outreachLeads.id, row.leadId),
      columns: { id: true, status: true, deletedAt: true },
    })
    if (lead && !lead.deletedAt) {
      const nextStatus = autoStatusAfterOpen(lead.status)
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

    log.debug({ emailId: row.id, leadId: row.leadId }, 'Open pixel')
    return pixelResponse()
  },
  { requireAuth: false },
)
