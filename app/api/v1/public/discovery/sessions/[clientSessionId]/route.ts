import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/with-api-handler'

/** Stub: Discovery UI guarda borrador en cliente; sin persistencia en servidor aún. */
export const GET = withApiHandler(
  async () => new NextResponse(null, { status: 404 }),
  { requireAuth: false },
)

export const PUT = withApiHandler(
  async () => new NextResponse(null, { status: 204 }),
  { requireAuth: false },
)
