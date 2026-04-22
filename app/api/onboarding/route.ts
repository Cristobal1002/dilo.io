import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users, organizations } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('onboarding')

const OnboardingSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).optional(),
  businessType: z.string().max(100).optional(),  // agencia, inmobiliaria, iglesia, otro
  useCase: z.string().max(500).optional(),        // para qué quieren usar Dilo
  teamSize: z.string().max(50).optional(),        // solo, pequeño (2-5), mediano (6-20), grande
})

export const POST = withApiHandler(
  async (req: NextRequest, { auth }) => {
    const { userId, org } = auth

    const body = await req.json()
    const parsed = OnboardingSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
    }

    const { name, phone, businessType, useCase, teamSize } = parsed.data

    // 1. Update user record (name + phone)
    const userUpdate: Record<string, unknown> = {}
    if (name) userUpdate.name = name
    if (phone) userUpdate.phone = phone

    if (Object.keys(userUpdate).length > 0) {
      await db
        .update(users)
        .set(userUpdate)
        .where(eq(users.clerkId, userId))
    }

    // 2. Update organization onboarding data
    const onboardingData: Record<string, unknown> = {}
    if (businessType) onboardingData.businessType = businessType
    if (useCase) onboardingData.useCase = useCase
    if (teamSize) onboardingData.teamSize = teamSize
    if (name) onboardingData.contactName = name

    if (Object.keys(onboardingData).length > 0) {
      await db
        .update(organizations)
        .set({ onboardingData })
        .where(eq(organizations.id, org.id))
    }

    // 3. Sync name + mark onboarding as completed in Clerk
    try {
      const clerk = await clerkClient()
      const clerkUpdate: Parameters<typeof clerk.users.updateUser>[1] = {
        // Mark onboarding completed — checked in proxy.ts to gate dashboard access
        publicMetadata: { onboardingCompleted: true },
      }
      if (name) {
        const parts = name.trim().split(/\s+/)
        clerkUpdate.firstName = parts[0] ?? ''
        clerkUpdate.lastName = parts.slice(1).join(' ') || undefined
      }
      await clerk.users.updateUser(userId, clerkUpdate)
    } catch (e) {
      log.warn({ userId, error: String(e) }, 'Failed to update Clerk user')
    }

    log.info({ userId, orgId: org.id, fields: Object.keys(parsed.data) }, 'Onboarding completed')

    return apiSuccess({ ok: true })
  },
  { requireAuth: true },
)
