import { NextResponse } from 'next/server'
import { buildClientImportTemplateBuffer } from '@/lib/client-excel'
import { requireOrgRoles } from '@/lib/org-role'
import { withApiHandler } from '@/lib/with-api-handler'

/** Descarga plantilla Excel para importar clientes. */
export const GET = withApiHandler(async (_req, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin', 'member'])

  const buffer = buildClientImportTemplateBuffer()
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="dilo-clientes-plantilla.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}, { requireAuth: true })
