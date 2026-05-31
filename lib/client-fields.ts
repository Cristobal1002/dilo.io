/** Tipos de identificación fiscal LATAM (extensible). */
export const CLIENT_TAX_ID_TYPES = [
  'nit_co',
  'ruc_pe',
  'rfc_mx',
  'rut_cl',
  'cuit_ar',
  'ruc_ec',
  'rif_ve',
  'rtn_hn',
  'cedula_juridica_cr',
  'generic',
] as const

export type ClientTaxIdType = (typeof CLIENT_TAX_ID_TYPES)[number]

export const CLIENT_TAX_ID_LABELS: Record<ClientTaxIdType, string> = {
  nit_co: 'NIT (Colombia)',
  ruc_pe: 'RUC (Perú)',
  rfc_mx: 'RFC (México)',
  rut_cl: 'RUT (Chile)',
  cuit_ar: 'CUIT (Argentina)',
  ruc_ec: 'RUC (Ecuador)',
  rif_ve: 'RIF (Venezuela)',
  rtn_hn: 'RTN (Honduras)',
  cedula_juridica_cr: 'Cédula jurídica (Costa Rica)',
  generic: 'Documento fiscal (otro)',
}

export const CLIENT_STATUSES = ['active', 'inactive'] as const
export type ClientStatus = (typeof CLIENT_STATUSES)[number]

export type ClientRecord = {
  id: string
  organizationId: string
  name: string
  slug: string
  legalName: string | null
  externalId: string | null
  taxIdType: string | null
  taxId: string | null
  email: string | null
  phone: string | null
  website: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  stateRegion: string | null
  postalCode: string | null
  countryCode: string | null
  notes: string | null
  status: string
  embedAllowedDomains: unknown
  createdAt: Date
  updatedAt: Date
}

export type ClientInput = {
  name: string
  legalName?: string | null
  externalId?: string | null
  taxIdType?: ClientTaxIdType | null
  taxId?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  stateRegion?: string | null
  postalCode?: string | null
  countryCode?: string | null
  notes?: string | null
  status?: ClientStatus
  embedAllowedDomains?: string[]
}

/** Columnas CSV para import (ver docs/CLIENTS_AND_EMBED.md). */
export const CLIENT_CSV_HEADERS = [
  'name',
  'legal_name',
  'external_id',
  'tax_id_type',
  'tax_id',
  'email',
  'phone',
  'website',
  'address_line1',
  'address_line2',
  'city',
  'state_region',
  'postal_code',
  'country_code',
  'notes',
] as const

export function clientToApi(row: ClientRecord) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    legalName: row.legalName,
    externalId: row.externalId,
    taxIdType: row.taxIdType,
    taxId: row.taxId,
    email: row.email,
    phone: row.phone,
    website: row.website,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    stateRegion: row.stateRegion,
    postalCode: row.postalCode,
    countryCode: row.countryCode,
    notes: row.notes,
    status: row.status,
    embedAllowedDomains: Array.isArray(row.embedAllowedDomains)
      ? (row.embedAllowedDomains as string[])
      : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function normalizeOptionalText(v: unknown, max = 500): string | null {
  if (v == null) return null
  const t = String(v).trim()
  if (!t) return null
  return t.slice(0, max)
}

export function normalizeCountryCode(v: unknown): string | null {
  const t = normalizeOptionalText(v, 2)
  if (!t) return null
  return t.toUpperCase()
}

export function normalizeTaxIdType(v: unknown): ClientTaxIdType | null {
  const t = normalizeOptionalText(v, 40)?.toLowerCase()
  if (!t) return null
  return (CLIENT_TAX_ID_TYPES as readonly string[]).includes(t) ? (t as ClientTaxIdType) : null
}

export function normalizeWebsite(v: unknown): string | null {
  const t = normalizeOptionalText(v, 500)
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

export function normalizeEmail(v: unknown): string | null {
  const t = normalizeOptionalText(v, 320)?.toLowerCase()
  if (!t) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null
  return t
}
