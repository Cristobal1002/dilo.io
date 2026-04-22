'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowTopRightOnSquareIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { DeleteFlowModal } from '@/components/ui/delete-flow-modal'
import { useToast } from '@/components/ui/toast'

export interface FlowListItem {
  id: string
  name: string
  status: string
  updatedAt: Date
  sessionCount: number
}

// ─── Estilos del menú — mismos que en DiloDashboardShell ──────────────────────
const menuPanel =
  'absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-visible rounded-xl border border-[#E5E7EB] bg-white px-0 pt-2 pb-2 font-sans text-sm antialiased shadow-lg dark:border-[#2A2F3F] dark:bg-[#1A1D29]'

const menuItem =
  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium rounded-md transition-colors text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F8F9FB] dark:hover:bg-[#252936] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB]'

const menuItemDanger =
  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium rounded-md transition-colors text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'

const menuDivider = 'my-1.5 border-t border-[#E5E7EB] dark:border-[#2A2F3F]'

const menuIcon = 'h-4 w-4 shrink-0'

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(d),
    )
  } catch {
    return String(d)
  }
}

// ─── Menú de acciones por tarjeta ─────────────────────────────────────────────
function FlowCardMenu({
  flow,
  onDelete,
}: {
  flow: FlowListItem
  onDelete: (flow: FlowListItem) => void
}) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        className="p-1.5 rounded-lg text-[#C8CED9] dark:text-[#5c6578] hover:bg-[#F3F4F6] dark:hover:bg-[#252936] hover:text-[#6B7280] dark:hover:text-[#9CA3AF] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Opciones de ${flow.name}`}
        title="Opciones"
        onClick={(e) => {
          e.preventDefault()
          setOpen((o) => !o)
        }}
      >
        <EllipsisVerticalIcon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={close} />
          <div id={menuId} className={menuPanel} role="menu" aria-label={`Opciones de ${flow.name}`}>
            {/* Ver flow — solo si está publicado */}
            {flow.status === 'published' ? (
              <Link
                href={`/f/${flow.id}`}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className={menuItem}
                onClick={close}
              >
                <ArrowTopRightOnSquareIcon className={menuIcon} strokeWidth={1.5} aria-hidden="true" />
                Ver flow
              </Link>
            ) : null}

            {/* Separador si hay items antes del peligroso */}
            {flow.status === 'published' ? <div className={menuDivider} /> : null}

            {/* Eliminar */}
            <button
              type="button"
              role="menuitem"
              className={menuItemDanger}
              onClick={(e) => {
                e.preventDefault()
                close()
                onDelete(flow)
              }}
            >
              <TrashIcon className={menuIcon} strokeWidth={1.5} aria-hidden="true" />
              Eliminar flow
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Lista de flows ────────────────────────────────────────────────────────────
export function FlowList({ flows }: { flows: FlowListItem[] }) {
  const router = useRouter()
  const toast = useToast()
  const [deletingFlow, setDeletingFlow] = useState<FlowListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteConfirm = async () => {
    if (!deletingFlow) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/flows/${deletingFlow.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast(`"${deletingFlow.name}" eliminado`, 'success')
        setDeletingFlow(null)
        router.refresh()
      } else {
        const body = await res.json().catch(() => ({}))
        toast(body?.error ?? 'No se pudo eliminar el flow. Inténtalo de nuevo.', 'error')
      }
    } catch {
      toast('Error de conexión. Inténtalo de nuevo.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <ul className="space-y-2.5">
        {flows.map((flow) => (
          <li
            key={flow.id}
            className="group flex items-stretch rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] transition-colors duration-200 hover:border-[#9C77F5]/22 hover:bg-[#F8F6FF] dark:border-[#2A2F3F] dark:bg-[#161821] dark:hover:border-[#9C77F5]/25 dark:hover:bg-[#1c1f2a]"
          >
            {/* Área clickeable de navegación — ocupa todo el espacio menos el botón ⋮ */}
            <Link
              href={`/dashboard/flows/${flow.id}`}
              className="flex flex-1 min-w-0 items-center px-4 py-4"
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
                    aria-hidden="true"
                  />
                  <p className="truncate font-semibold tracking-tight text-foreground">
                    {flow.name}
                  </p>
                </div>
                <p className="mt-1 pl-4 text-xs leading-relaxed text-muted-foreground">
                  {flow.status === 'published'
                    ? 'Publicado'
                    : flow.status === 'archived'
                      ? 'Archivado'
                      : 'Borrador'}
                  {' · '}
                  Actualizado {formatDate(flow.updatedAt)}
                  {flow.sessionCount > 0
                    ? ` · ${flow.sessionCount} ${flow.sessionCount === 1 ? 'sesión' : 'sesiones'}`
                    : ''}
                </p>
              </div>
            </Link>

            {/* Menú ⋮ — dentro de la tarjeta, separado del Link */}
            <div className="flex items-center pr-3">
              <FlowCardMenu flow={flow} onDelete={setDeletingFlow} />
            </div>
          </li>
        ))}
      </ul>

      {deletingFlow ? (
        <DeleteFlowModal
          isOpen
          onClose={() => { if (!isDeleting) setDeletingFlow(null) }}
          flowName={deletingFlow.name}
          sessionCount={deletingFlow.sessionCount}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  )
}
