import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, organizations } from '@/db/schema'

export default async function DashboardPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgId ?? userId),
  })

  const flowList = org
    ? await db.query.flows.findMany({
        where: eq(flows.organizationId, org.id),
        orderBy: desc(flows.updatedAt),
        limit: 50,
      })
    : []

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Mis Flows</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Crea flujos conversacionales desde un prompt de texto
          </p>
        </div>
        <Link
          href="/dashboard/flows/new"
          className="inline-flex justify-center items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-linear-to-br from-dilo-500 to-dilo-600 shadow-md shadow-dilo-500/25 hover:opacity-95 transition-opacity"
        >
          + Nuevo Flow
        </Link>
      </div>

      {flowList.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-dilo-50/40 p-14 md:p-16 text-center">
          <div className="text-5xl mb-4" aria-hidden>
            💬
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Aún no tienes flows</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm leading-relaxed">
            Describe lo que necesitas en una frase y Dilo genera el flujo conversacional automáticamente
          </p>
          <Link
            href="/dashboard/flows/new"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-linear-to-br from-dilo-500 to-dilo-600 shadow-md shadow-dilo-500/25 hover:opacity-95 transition-opacity"
          >
            Crear mi primer flow
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {flowList.map((flow) => (
            <li key={flow.id}>
              <Link
                href={`/dashboard/flows/${flow.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] dark:border-[#2A2F3F] bg-white dark:bg-[#1A1D29] px-4 py-4 shadow-sm hover:border-[#9C77F5]/40 hover:bg-[#9C77F5]/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{flow.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {flow.status === 'published' ? 'Publicado' : flow.status === 'archived' ? 'Archivado' : 'Borrador'}
                    {' · '}
                    Actualizado {formatDate(flow.updatedAt)}
                  </p>
                </div>
                <span className="text-sm font-medium text-[#9C77F5] shrink-0">Abrir editor →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  } catch {
    return String(d)
  }
}
