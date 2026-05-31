import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { clients, supportCases } from '@/db/schema'
import {
  type ClientInput,
  type ClientRecord,
  normalizeCountryCode,
  normalizeEmail,
  normalizeOptionalText,
  normalizeTaxIdType,
  normalizeWebsite,
} from '@/lib/client-fields'

function slugifyClientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

export function isUuidLike(v: string): boolean {
  const s = v.trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

async function ensureUniqueSlug(organizationId: string, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug || 'cliente'
  for (let i = 0; i < 30; i++) {
    const taken = await db.query.clients.findFirst({
      where: and(
        eq(clients.organizationId, organizationId),
        eq(clients.slug, slug),
        excludeId ? sql`${clients.id} <> ${excludeId}` : sql`true`,
      ),
      columns: { id: true },
    })
    if (!taken) return slug
    slug = `${baseSlug}_${i + 2}`.slice(0, 80)
  }
  return `${baseSlug}_${Date.now()}`.slice(0, 80)
}

function mapInputToValues(input: ClientInput) {
  const name = input.name.trim().slice(0, 200)
  return {
    name,
    legalName: normalizeOptionalText(input.legalName, 200),
    externalId: normalizeOptionalText(input.externalId, 120),
    taxIdType: normalizeTaxIdType(input.taxIdType),
    taxId: normalizeOptionalText(input.taxId, 80),
    email: normalizeEmail(input.email),
    phone: normalizeOptionalText(input.phone, 80),
    website: normalizeWebsite(input.website),
    addressLine1: normalizeOptionalText(input.addressLine1, 200),
    addressLine2: normalizeOptionalText(input.addressLine2, 200),
    city: normalizeOptionalText(input.city, 120),
    stateRegion: normalizeOptionalText(input.stateRegion, 120),
    postalCode: normalizeOptionalText(input.postalCode, 32),
    countryCode: normalizeCountryCode(input.countryCode),
    notes: normalizeOptionalText(input.notes, 4000),
    status: input.status === 'inactive' ? 'inactive' : 'active',
    embedAllowedDomains: Array.isArray(input.embedAllowedDomains)
      ? input.embedAllowedDomains.map((d) => d.trim()).filter(Boolean).slice(0, 20)
      : [],
  }
}

export async function createClientRecord(args: {
  organizationId: string
  input: ClientInput
}): Promise<ClientRecord> {
  const values = mapInputToValues(args.input)
  if (values.name.length < 2) throw new Error('INVALID_NAME')

  if (values.externalId) {
    const dup = await db.query.clients.findFirst({
      where: and(eq(clients.organizationId, args.organizationId), eq(clients.externalId, values.externalId)),
      columns: { id: true },
    })
    if (dup) throw new Error('DUPLICATE_EXTERNAL_ID')
  }

  const slug = await ensureUniqueSlug(args.organizationId, slugifyClientName(values.name) || 'cliente')
  const now = new Date()
  const [row] = await db
    .insert(clients)
    .values({
      organizationId: args.organizationId,
      slug,
      ...values,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return row
}

export async function updateClientRecord(args: {
  organizationId: string
  clientId: string
  input: Partial<ClientInput>
}): Promise<ClientRecord | null> {
  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.organizationId, args.organizationId), eq(clients.id, args.clientId)),
  })
  if (!existing) return null

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (args.input.name !== undefined) {
    const name = args.input.name.trim().slice(0, 200)
    if (name.length < 2) throw new Error('INVALID_NAME')
    patch.name = name
    if (name !== existing.name) {
      patch.slug = await ensureUniqueSlug(args.organizationId, slugifyClientName(name) || 'cliente', args.clientId)
    }
  }
  if (args.input.legalName !== undefined) patch.legalName = normalizeOptionalText(args.input.legalName, 200)
  if (args.input.externalId !== undefined) {
    const ext = normalizeOptionalText(args.input.externalId, 120)
    if (ext) {
      const dup = await db.query.clients.findFirst({
        where: and(
          eq(clients.organizationId, args.organizationId),
          eq(clients.externalId, ext),
          sql`${clients.id} <> ${args.clientId}`,
        ),
        columns: { id: true },
      })
      if (dup) throw new Error('DUPLICATE_EXTERNAL_ID')
    }
    patch.externalId = ext
  }
  if (args.input.taxIdType !== undefined) patch.taxIdType = normalizeTaxIdType(args.input.taxIdType)
  if (args.input.taxId !== undefined) patch.taxId = normalizeOptionalText(args.input.taxId, 80)
  if (args.input.email !== undefined) patch.email = normalizeEmail(args.input.email)
  if (args.input.phone !== undefined) patch.phone = normalizeOptionalText(args.input.phone, 80)
  if (args.input.website !== undefined) patch.website = normalizeWebsite(args.input.website)
  if (args.input.addressLine1 !== undefined) patch.addressLine1 = normalizeOptionalText(args.input.addressLine1, 200)
  if (args.input.addressLine2 !== undefined) patch.addressLine2 = normalizeOptionalText(args.input.addressLine2, 200)
  if (args.input.city !== undefined) patch.city = normalizeOptionalText(args.input.city, 120)
  if (args.input.stateRegion !== undefined) patch.stateRegion = normalizeOptionalText(args.input.stateRegion, 120)
  if (args.input.postalCode !== undefined) patch.postalCode = normalizeOptionalText(args.input.postalCode, 32)
  if (args.input.countryCode !== undefined) patch.countryCode = normalizeCountryCode(args.input.countryCode)
  if (args.input.notes !== undefined) patch.notes = normalizeOptionalText(args.input.notes, 4000)
  if (args.input.status !== undefined) patch.status = args.input.status === 'inactive' ? 'inactive' : 'active'
  if (args.input.embedAllowedDomains !== undefined) {
    patch.embedAllowedDomains = args.input.embedAllowedDomains.map((d) => d.trim()).filter(Boolean).slice(0, 20)
  }

  const [row] = await db
    .update(clients)
    .set(patch)
    .where(and(eq(clients.id, args.clientId), eq(clients.organizationId, args.organizationId)))
    .returning()
  return row ?? null
}

export async function getClientById(args: {
  organizationId: string
  clientId: string
}): Promise<ClientRecord | null> {
  return (
    (await db.query.clients.findFirst({
      where: and(eq(clients.organizationId, args.organizationId), eq(clients.id, args.clientId)),
    })) ?? null
  )
}

export async function getClientNameById(args: {
  organizationId: string
  clientId: string
}): Promise<string | null> {
  const row = await db.query.clients.findFirst({
    where: and(eq(clients.organizationId, args.organizationId), eq(clients.id, args.clientId)),
    columns: { name: true },
  })
  return row?.name ?? null
}

export async function getClientByExternalId(args: {
  organizationId: string
  externalId: string
}): Promise<ClientRecord | null> {
  const ext = args.externalId.trim()
  if (!ext) return null
  return (
    (await db.query.clients.findFirst({
      where: and(eq(clients.organizationId, args.organizationId), eq(clients.externalId, ext)),
    })) ?? null
  )
}

export async function resolveClientForEmbed(args: {
  organizationId: string
  clientId?: string | null
  externalId?: string | null
}): Promise<ClientRecord | null> {
  if (args.clientId && isUuidLike(args.clientId)) {
    const row = await getClientById({ organizationId: args.organizationId, clientId: args.clientId.trim() })
    if (row && row.status === 'active') return row
  }
  if (args.externalId) {
    const row = await getClientByExternalId({ organizationId: args.organizationId, externalId: args.externalId })
    if (row && row.status === 'active') return row
  }
  return null
}

export async function ensureClientByName(args: {
  organizationId: string
  name: string
}): Promise<{ id: string; name: string; slug: string }> {
  const name = args.name.trim().slice(0, 200)
  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.organizationId, args.organizationId), eq(clients.name, name)),
    columns: { id: true, name: true, slug: true },
  })
  if (existing) return existing

  const row = await createClientRecord({ organizationId: args.organizationId, input: { name } })
  return { id: row.id, name: row.name, slug: row.slug }
}

export async function deleteOrDeactivateClient(args: {
  organizationId: string
  clientId: string
}): Promise<'deleted' | 'deactivated' | null> {
  const existing = await getClientById(args)
  if (!existing) return null

  const linked = await db.query.supportCases.findFirst({
    where: and(eq(supportCases.organizationId, args.organizationId), eq(supportCases.clientId, args.clientId)),
    columns: { id: true },
  })

  if (linked) {
    await db
      .update(clients)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(and(eq(clients.id, args.clientId), eq(clients.organizationId, args.organizationId)))
    return 'deactivated'
  }

  await db
    .delete(clients)
    .where(and(eq(clients.id, args.clientId), eq(clients.organizationId, args.organizationId)))
  return 'deleted'
}

export async function backfillClientsFromSupportCases(args: {
  organizationId: string
}): Promise<{ created: number; linked: number }> {
  const distinct = await db
    .select({ name: supportCases.clientCompany })
    .from(supportCases)
    .where(and(eq(supportCases.organizationId, args.organizationId), sql`${supportCases.clientCompany} IS NOT NULL`))
    .groupBy(supportCases.clientCompany)

  let created = 0
  let linked = 0

  for (const r of distinct) {
    const raw = (r.name ?? '').trim()
    if (!raw) continue
    const c = await ensureClientByName({ organizationId: args.organizationId, name: raw })
    created += 1
    const res = await db
      .update(supportCases)
      .set({ clientId: c.id, clientCompany: c.name, updatedAt: new Date() })
      .where(
        and(
          eq(supportCases.organizationId, args.organizationId),
          eq(supportCases.clientCompany, raw),
          sql`${supportCases.clientId} IS NULL`,
        ),
      )
    linked += Number((res as unknown as { rowCount?: number }).rowCount ?? 0)
  }

  return { created, linked }
}

export function parseClientCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const delim = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ','
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, j) => {
      row[h] = cols[j] ?? ''
    })
    rows.push(row)
  }
  return rows
}

export async function importClientsFromRows(args: {
  organizationId: string
  rows: Record<string, string>[]
  updateExisting?: boolean
}): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < args.rows.length; i++) {
    const r = args.rows[i]
    const name = (r.name ?? r.nombre ?? '').trim()
    if (!name) {
      skipped += 1
      continue
    }

    const input: ClientInput = {
      name,
      legalName: r.legal_name ?? r.razon_social ?? null,
      externalId: r.external_id ?? r.id_externo ?? null,
      taxIdType: normalizeTaxIdType(r.tax_id_type ?? r.tipo_documento) ?? undefined,
      taxId: r.tax_id ?? r.nit ?? r.documento ?? null,
      email: r.email ?? r.correo ?? null,
      phone: r.phone ?? r.telefono ?? null,
      website: r.website ?? r.web ?? null,
      addressLine1: r.address_line1 ?? r.direccion ?? null,
      addressLine2: r.address_line2 ?? null,
      city: r.city ?? r.ciudad ?? null,
      stateRegion: r.state_region ?? r.departamento ?? r.provincia ?? null,
      postalCode: r.postal_code ?? r.codigo_postal ?? null,
      countryCode: r.country_code ?? r.pais ?? null,
      notes: r.notes ?? r.notas ?? null,
    }

    try {
      let existing: ClientRecord | null = null
      const ext = normalizeOptionalText(input.externalId, 120)
      if (ext) {
        existing = await getClientByExternalId({ organizationId: args.organizationId, externalId: ext })
      }
      if (!existing) {
        existing =
          (await db.query.clients.findFirst({
            where: and(eq(clients.organizationId, args.organizationId), eq(clients.name, name)),
          })) ?? null
      }

      if (existing) {
        if (args.updateExisting) {
          await updateClientRecord({
            organizationId: args.organizationId,
            clientId: existing.id,
            input,
          })
          updated += 1
        } else {
          skipped += 1
        }
      } else {
        await createClientRecord({ organizationId: args.organizationId, input })
        created += 1
      }
    } catch (e) {
      errors.push(`Fila ${i + 2}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  return { created, updated, skipped, errors }
}
