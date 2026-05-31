import * as XLSX from 'xlsx'

/** Encabezados de la plantilla Excel (español, amigable). */
export const CLIENT_EXCEL_HEADERS = [
  'nombre_comercial',
  'razon_social',
  'id_en_tu_sistema',
  'tipo_documento',
  'numero_documento',
  'email',
  'telefono',
  'sitio_web',
  'direccion',
  'direccion_2',
  'ciudad',
  'departamento',
  'codigo_postal',
  'pais',
  'notas',
] as const

const EXAMPLE_ROW = [
  'Acme Corp',
  'Acme S.A.S.',
  'tenant_001',
  'nit_co',
  '900123456',
  'contacto@acme.com',
  '+57 300 111 2233',
  'https://acme.com',
  'Calle 1 # 2-3',
  'Oficina 401',
  'Bogotá',
  'Cundinamarca',
  '110111',
  'CO',
  'Cliente de ejemplo — puedes borrar esta fila',
]

const HELP_ROWS: string[][] = [
  ['Cómo usar esta plantilla'],
  [''],
  ['1. Rellena la hoja "Clientes" (una fila por empresa que atiendes).'],
  ['2. nombre_comercial es obligatorio.'],
  ['3. id_en_tu_sistema: el código que ya usas en tu plataforma (muy útil para el embed).'],
  ['4. tipo_documento: nit_co, ruc_pe, rfc_mx, rut_cl, cuit_ar, ruc_ec, rif_ve, rtn_hn, cedula_juridica_cr o generic'],
  ['5. pais: código de 2 letras (CO, MX, PE, CL, AR…).'],
  ['6. Guarda el archivo y súbelo en Clientes → Cargar plantilla.'],
  [''],
  ['Para insertar el formulario en tu web, ve a Configuración → Métodos de conexión → Widget embebido.'],
]

/** Normaliza claves de fila Excel/CSV a nombres internos. */
export function normalizeImportRow(raw: Record<string, unknown>): Record<string, string> {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k]
      if (v != null && String(v).trim() !== '') return String(v).trim()
    }
    return ''
  }

  return {
    name: get('nombre_comercial', 'name', 'nombre'),
    legal_name: get('razon_social', 'legal_name'),
    external_id: get('id_en_tu_sistema', 'external_id', 'id_externo'),
    tax_id_type: get('tipo_documento', 'tax_id_type'),
    tax_id: get('numero_documento', 'tax_id', 'nit', 'documento'),
    email: get('email', 'correo'),
    phone: get('telefono', 'phone'),
    website: get('sitio_web', 'website', 'web'),
    address_line1: get('direccion', 'address_line1'),
    address_line2: get('direccion_2', 'address_line2'),
    city: get('ciudad', 'city'),
    state_region: get('departamento', 'state_region', 'provincia'),
    postal_code: get('codigo_postal', 'postal_code'),
    country_code: get('pais', 'country_code'),
    notes: get('notas', 'notes'),
  }
}

export function buildClientImportTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new()
  const dataSheet = XLSX.utils.aoa_to_sheet([CLIENT_EXCEL_HEADERS as unknown as string[], EXAMPLE_ROW])
  const helpSheet = XLSX.utils.aoa_to_sheet(HELP_ROWS)
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Clientes')
  XLSX.utils.book_append_sheet(wb, helpSheet, 'Instrucciones')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function parseClientExcelBuffer(buffer: ArrayBuffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes('client')) ?? wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const out: Record<string, string>[] = []

  for (const raw of rawRows) {
    const normalized: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      normalized[k.trim().toLowerCase()] = v == null ? '' : String(v).trim()
    }
    const row = normalizeImportRow(normalized)
    if (!row.name) continue
    out.push(row)
  }

  return out
}
