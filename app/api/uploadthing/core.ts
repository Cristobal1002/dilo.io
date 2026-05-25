import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from '@uploadthing/shared'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { getAuthContext } from '@/lib/auth'
import { canManageIntegrations } from '@/lib/org-role'

const f = createUploadthing()

export const ourFileRouter = {
  organizationLogo: f({
    image: { maxFileSize: '2MB', maxFileCount: 1 },
  })
    .middleware(async () => {
      const auth = await getAuthContext()
      if (!canManageIntegrations(auth.orgRole)) {
        throw new UploadThingError('Sin permisos para subir el logo')
      }
      return { organizationId: auth.org.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const url = file.ufsUrl ?? file.url
      if (!url || !/^https:\/\//i.test(url)) return
      await db
        .update(organizations)
        .set({ logoUrl: url })
        .where(eq(organizations.id, metadata.organizationId))
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
