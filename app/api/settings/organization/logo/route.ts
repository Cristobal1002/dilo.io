import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { UTApi, UTFile } from 'uploadthing/server'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { validateOrganizationLogoFile } from '@/lib/organization-logo'
import { requireOrgRoles } from '@/lib/org-role'
import { isUploadthingConfigured } from '@/lib/uploadthing-config'
import { withApiHandler } from '@/lib/with-api-handler'

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  if (!isUploadthingConfigured()) {
    throw new ValidationError(
      'Subida de logo no configurada. Añade UPLOADTHING_TOKEN en .env.local (clave en uploadthing.com → API Keys) y reinicia npm run dev.',
    )
  }

  const form = await req.formData()
  const raw = form.get('file')
  if (!(raw instanceof File) || raw.size === 0) {
    throw new ValidationError('Selecciona un archivo de imagen.')
  }

  const validationError = await validateOrganizationLogoFile(raw)
  if (validationError) {
    throw new ValidationError(validationError)
  }

  const buffer = Buffer.from(await raw.arrayBuffer())
  const utFile = new UTFile([buffer], raw.name, { type: raw.type })
  const utapi = new UTApi()
  const result = await utapi.uploadFiles(utFile)

  const url =
    (Array.isArray(result) ? result[0]?.data?.url : result?.data?.url) ??
    (Array.isArray(result) ? result[0]?.ufsUrl : (result as { ufsUrl?: string })?.ufsUrl)

  if (!url || !/^https:\/\//i.test(url)) {
    throw new ValidationError('Uploadthing no devolvió una URL válida. Revisa UPLOADTHING_TOKEN.')
  }

  await db
    .update(organizations)
    .set({ logoUrl: url })
    .where(eq(organizations.id, auth.org.id))

  return apiSuccess({ logoUrl: url })
}, { requireAuth: true })
