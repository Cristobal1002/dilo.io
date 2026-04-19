import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
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
          className="inline-flex items-center justify-center rounded-full bg-linear-to-br from-dilo-500 to-dilo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-dilo-500/20 transition-opacity hover:opacity-95"
        >
          + Nuevo Flow
        </Link>
      </div>

      {flowList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E0E4EB] bg-[#FAFBFC] p-14 text-center dark:border-[#2A2F3F] dark:bg-[#161821] md:p-16">
          <div className="text-5xl mb-4" aria-hidden>
            💬
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Aún no tienes flows</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm leading-relaxed">
            Describe lo que necesitas en una frase y Dilo genera el flujo conversacional automáticamente
          </p>
          <Link
            href="/dashboard/flows/new"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white bg-linear-to-br from-dilo-500 to-dilo-600 shadow-sm shadow-dilo-500/20 transition-opacity hover:opacity-95"
          >
            Crear mi primer flow
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {flowList.map((flow) => (
            <li key={flow.id}>
              <Link
                href={`/dashboard/flows/${flow.id}`}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] px-4 py-4 transition-colors duration-200 hover:border-[#9C77F5]/22 hover:bg-[#F8F6FF] dark:border-[#2A2F3F] dark:bg-[#161821] dark:hover:border-[#9C77F5]/25 dark:hover:bg-[#1c1f2a]"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'inline-block h-2 w-2 shrink-0 rounded-full',
                        flow.status === 'published'
                          ? 'bg-emerald-400'
                          : flow.status === 'archived'
                            ? 'bg-amber-400'
                            : 'bg-gray-300 dark:bg-gray-500',
                      )}
                      title={
                        flow.status === 'published'
                          ? 'Publicado'
                          : flow.status === 'archived'
                            ? 'Archivado'
                            : 'Borrador'
                      }
                      aria-hidden
                    />
                    <p className="truncate font-semibold tracking-tight text-foreground">{flow.name}</p>
                  </div>
                  <p className="mt-1 pl-4 text-xs leading-relaxed text-muted-foreground">
                    {flow.status === 'published' ? 'Publicado' : flow.status === 'archived' ? 'Archivado' : 'Borrador'}
                    {' · '}
                    Actualizado {formatDate(flow.updatedAt)}
                  </p>
                </div>
                <span className="sr-only">Abrir editor</span>
                <ChevronRightIcon
                  className="h-4 w-4 shrink-0 text-[#C8CED9] transition-colors group-hover:text-[#94A3B8] dark:text-[#5c6578] dark:group-hover:text-[#94A3B8]"
                  strokeWidth={1.75}
                  aria-hidden
                />
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
