import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('settings/profile')

const ProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200).trim(),
  phone: z.string().max(30).trim().optional(),
})

export const PATCH = withApiHandler(
  async (req: NextRequest, { auth }) => {
    const { userId } = auth

    const body = await req.json()
    const parsed = ProfileSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
    }

    const { name, phone } = parsed.data

    // Update user record in DB
    await db
      .update(users)
      .set({ name, phone: phone ?? null })
      .where(eq(users.clerkId, userId))

    // Sync name to Clerk
    try {
      const clerk = await clerkClient()
      const parts = name.trim().split(/\s+/)
      await clerk.users.updateUser(userId, {
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' ') || undefined,
      })
    } catch (e) {
      log.warn({ userId, error: String(e) }, 'Failed to sync name to Clerk')
    }

    log.info({ userId }, 'Profile updated')

    return apiSuccess({ ok: true })
  },
  { requireAuth: true },
)

export const GET = withApiHandler(
  async (_req: NextRequest, { auth }) => {
    const { userId } = auth

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: { name: true, phone: true, email: true, role: true },
    })

    return apiSuccess({ user })
  },
  { requireAuth: true },
)
