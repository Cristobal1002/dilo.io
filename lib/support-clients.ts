import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { clients, supportCases } from '@/db/schema'

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

export async function ensureClientByName(args: {
  organizationId: string
  name: string
}): Promise<{ id: string; name: string; slug: string }> {
  const name = args.name.trim().slice(0, 200)
  const baseSlug = slugifyClientName(name) || 'cliente'

  // Try existing by exact name first
  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.organizationId, args.organizationId), eq(clients.name, name)),
    columns: { id: true, name: true, slug: true },
  })
  if (existing) return existing

  // Ensure unique slug within org
  let slug = baseSlug
  for (let i = 0; i < 20; i++) {
    const taken = await db.query.clients.findFirst({
      where: and(eq(clients.organizationId, args.organizationId), eq(clients.slug, slug)),
      columns: { id: true },
    })
    if (!taken) break
    slug = `${baseSlug}_${i + 2}`.slice(0, 80)
  }

  const now = new Date()
  const [row] = await db
    .insert(clients)
    .values({
      organizationId: args.organizationId,
      name,
      slug,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: clients.id, name: clients.name, slug: clients.slug })
  return row
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

/** Crea clients faltantes desde `support_cases.client_company` y rellena `client_id`. */
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

