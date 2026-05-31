import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/api-response'
import { parseClientExcelBuffer } from '@/lib/client-excel'
import { ValidationError } from '@/lib/errors'
import { requireOrgRoles } from '@/lib/org-role'
import { importClientsFromRows, parseClientCsv } from '@/lib/support-clients'
import { withApiHandler } from '@/lib/with-api-handler'

/** Importa clientes desde plantilla Excel (.xlsx). */
export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    throw new ValidationError('Selecciona un archivo Excel (.xlsx)')
  }

  const name = file.name.toLowerCase()
  const updateExisting = form.get('updateExisting') === 'true' || form.get('updateExisting') === '1'

  let rows: Record<string, string>[] = []

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    rows = parseClientExcelBuffer(buffer)
  } else if (name.endsWith('.csv')) {
    rows = parseClientCsv(await file.text())
  } else {
    throw new ValidationError('Formato no soportado. Usa la plantilla Excel (.xlsx) que descargas desde Clientes.')
  }

  if (rows.length === 0) {
    throw new ValidationError(
      'No encontramos filas válidas. Usa la plantilla, deja la fila de encabezados y añade al menos un cliente con nombre_comercial.',
    )
  }

  const result = await importClientsFromRows({
    organizationId: auth.org.id,
    rows,
    updateExisting,
  })

  return apiSuccess(result)
}, { requireAuth: true })
