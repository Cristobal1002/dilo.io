'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  EllipsisVerticalIcon,
  InformationCircleIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'
import { readApiResult } from '@/lib/read-api-result'
import { cn } from '@/lib/utils'
import { downloadDetailTableExcel } from '@/lib/export-flow-results-detail-excel'
import type { FlowResultsAnalytics } from '@/lib/flow-results-analytics'
import type { DetailTableRow, FlowResultsDetailTable } from '@/lib/flow-results-detail-table'

export type FlowResultRow = {
  sessionId: string
  completedAt: string | null
  summary: string | null
  score: number | null
  classification: string | null
  suggestedAction: string | null
  contact?: unknown
}

const classificationLabel: Record<string, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
}

const tabs = [
  { id: 'resumen' as const, label: 'Resumen' },
  { id: 'metricas' as const, label: 'Métricas' },
  { id: 'detalle' as const, label: 'Detalle' },
]

function parseTab(raw: string | null): (typeof tabs)[number]['id'] {
  if (raw === 'metricas' || raw === 'detalle') return raw
  return 'resumen'
}

function formatAvgDuration(ms: number | null) {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${r}s`
}

function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  const w = 120
  const h = 32
  const max = Math.max(1, ...values)
  const n = values.length
  const step = n <= 1 ? 0 : (w - 4) / (n - 1)
  const pts = values.map((v, i) => {
    const x = 2 + (n <= 1 ? w / 2 - 2 : i * step)
    const y = h - 4 - (v / max) * (h - 10)
    return `${x},${y}`
  })
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('w-full max-w-[140px] text-[#9C77F5]', className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(' ')}
      />
      {values.map((v, i) => {
        const x = 2 + (n <= 1 ? w / 2 - 2 : i * step)
        const y = h - 4 - (v / max) * (h - 10)
        return <circle key={i} cx={x} cy={y} r="2.25" className="fill-[#9C77F5]" />
      })}
    </svg>
  )
}

function MetricHint({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[#9CA3AF]" title={title}>
      <InformationCircleIcon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
    </span>
  )
}

function ClassificationBadge({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-[#9CA3AF]">—</span>
  }
  return (
    <span
      className={
        value === 'hot'
          ? 'rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300'
          : value === 'warm'
            ? 'rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-200'
            : 'rounded-full bg-slate-500/15 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300'
      }
    >
      {classificationLabel[value] ?? value}
    </span>
  )
}

const thBase =
  'border-b border-[#E8EAEF] bg-[#FAFBFC] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#94A3B8]'
const tdBase = 'border-b border-[#E8EAEF] px-3 py-2.5 align-top text-sm text-[#374151] dark:border-[#2A2F3F] dark:text-[#D1D5DB]'

type SortKey = 'classification' | 'score' | 'completedAt' | 'displayName'
type SortDir = 'asc' | 'desc'

function classificationRank(c: string | null): number {
  if (c === 'hot') return 3
  if (c === 'warm') return 2
  if (c === 'cold') return 1
  return 0
}

function compareDetailRows(a: DetailTableRow, b: DetailTableRow, key: SortKey, dir: SortDir): number {
  const m = dir === 'asc' ? 1 : -1
  if (key === 'classification') {
    const byRank = classificationRank(a.classification) - classificationRank(b.classification)
    if (byRank !== 0) return byRank * m
    return (a.classification ?? '').localeCompare(b.classification ?? '', 'es') * m
  }
  if (key === 'score') {
    const av = a.score ?? -1
    const bv = b.score ?? -1
    return (av - bv) * m
  }
  if (key === 'completedAt') {
    const at = a.completedAt ? new Date(a.completedAt).getTime() : 0
    const bt = b.completedAt ? new Date(b.completedAt).getTime() : 0
    return (at - bt) * m
  }
  return a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' }) * m
}

function formatTableDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}

function buildClipboardText(row: DetailTableRow, detailTable: FlowResultsDetailTable): string {
  const lines: string[] = []
  lines.push(`Clasificación: ${row.classification ?? '—'}`)
  if (detailTable.hasScores) {
    lines.push(`Score: ${row.score != null ? String(row.score) : '—'}`)
  }
  lines.push(`Fecha: ${formatTableDate(row.completedAt)}`)
  lines.push(`Nombre: ${row.displayName || '—'}`)
  for (const c of detailTable.contactColumns) {
    lines.push(`${c.label}: ${row.contact[c.key] ?? '—'}`)
  }
  for (const c of detailTable.stepColumns) {
    lines.push(`${c.fullQuestion}: ${row.stepCells[c.stepId] ?? '—'}`)
  }
  return lines.join('\n')
}

/** Mismo patrón que `flow-editor` / header (ghost ⋮). */
const rowMenuTrigger =
  'p-2 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#252936] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB] transition-colors'

/** Menú en portal + fixed: evita recorte por overflow del scroll de la tabla y solapa sticky. */
const rowMenuPortalBackdrop = 'fixed inset-0 z-[200] bg-black/5 dark:bg-black/20'

const rowMenuPortalPanel =
  'fixed z-[210] min-w-[260px] max-w-[min(320px,calc(100vw-1rem))] rounded-xl border border-[#E5E7EB] bg-white py-2 font-sans text-sm antialiased shadow-xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]'

const rowMenuItem =
  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium whitespace-normal text-[#4B5563] transition-colors hover:bg-[#F8F9FB] dark:text-[#9CA3AF] dark:hover:bg-[#252936] dark:hover:text-[#F8F9FB]'

const rowMenuItemDisabled =
  'cursor-not-allowed opacity-45 hover:bg-transparent dark:hover:bg-transparent dark:hover:text-[#9CA3AF]'

const rowMenuIcon = 'h-5 w-5 shrink-0'

function triggerAnchorDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function computeMenuPosition(trigger: DOMRect) {
  const menuWidth = 260
  const margin = 8
  const estHeight = 200
  let left = trigger.right - menuWidth
  left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin))
  let top = trigger.bottom + 6
  if (top + estHeight > window.innerHeight - margin) {
    top = Math.max(margin, trigger.top - estHeight - 6)
  }
  return { top, left }
}

function DetailSessionRowMenu({
  flowId,
  row,
  detailTable,
}: {
  flowId: string
  row: DetailTableRow
  detailTable: FlowResultsDetailTable
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const close = useCallback(() => {
    setOpen(false)
    setMenuPos(null)
  }, [])

  const openMenu = useCallback(() => {
    const el = btnRef.current
    if (!el) return
    setMenuPos(computeMenuPosition(el.getBoundingClientRect()))
    setOpen(true)
  }, [])

  const toggle = useCallback(() => {
    if (open) {
      close()
      return
    }
    openMenu()
  }, [open, close, openMenu])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const onScroll = () => close()
    window.addEventListener('scroll', onScroll, true)
    const onResize = () => {
      const el = btnRef.current
      if (el) setMenuPos(computeMenuPosition(el.getBoundingClientRect()))
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, close])

  const handleCopy = async () => {
    const text = buildClipboardText(row, detailTable)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
    close()
  }

  const handleDownloadResources = useCallback(async () => {
    close()
    const res = await fetch(
      `/api/flows/${encodeURIComponent(flowId)}/sessions/${encodeURIComponent(row.sessionId)}/file-resources`,
    )
    type FileRes = {
      groups: Array<{
        question: string
        files: Array<{ name: string; mime: string; href: string; kind: 'dataUrl' | 'url' }>
      }>
    }
    const parsed = await readApiResult<FileRes>(res)
    if (!parsed.ok) return
    const { groups } = parsed.data
    const fileCount = groups.reduce((n, g) => n + g.files.length, 0)
    if (fileCount === 0) return
    const used = new Map<string, number>()
    const nextFilename = (base: string) => {
      const safe = base.trim() || 'archivo'
      const k = used.get(safe) ?? 0
      used.set(safe, k + 1)
      if (k === 0) return safe
      const dot = safe.lastIndexOf('.')
      if (dot > 0) return `${safe.slice(0, dot)} (${k + 1})${safe.slice(dot)}`
      return `${safe} (${k + 1})`
    }
    for (const g of groups) {
      for (const f of g.files) {
        const filename = nextFilename(f.name)
        if (f.kind === 'dataUrl') {
          triggerAnchorDownload(f.href, filename)
          continue
        }
        try {
          const fr = await fetch(f.href, { mode: 'cors' })
          if (!fr.ok) throw new Error('bad status')
          const blob = await fr.blob()
          const obj = URL.createObjectURL(blob)
          triggerAnchorDownload(obj, filename)
          URL.revokeObjectURL(obj)
        } catch {
          window.open(f.href, '_blank', 'noopener,noreferrer')
        }
      }
    }
  }, [close, flowId, row.sessionId])

  const portal =
    open &&
    menuPos &&
    typeof document !== 'undefined' &&
    createPortal(
      <>
        <div className={rowMenuPortalBackdrop} aria-hidden onClick={close} />
        <div
          className={rowMenuPortalPanel}
          role="menu"
          aria-label="Acciones de la sesión"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <Link
            href={`/dashboard/flows/${flowId}/results/${row.sessionId}`}
            role="menuitem"
            className={rowMenuItem}
            onClick={close}
          >
            <ArrowTopRightOnSquareIcon className={rowMenuIcon} strokeWidth={1.5} aria-hidden />
            Abrir
          </Link>
          <button type="button" role="menuitem" className={rowMenuItem} onClick={handleCopy}>
            <ClipboardDocumentIcon className={rowMenuIcon} strokeWidth={1.5} aria-hidden />
            Copiar respuestas completas
          </button>
          {row.hasFileAttachments ? (
            <button
              type="button"
              role="menuitem"
              disabled={!row.hasDownloadableFileData}
              title={
                row.hasDownloadableFileData
                  ? undefined
                  : 'Solo hay nombres de archivo guardados, sin contenido descargable. Vuelve a completar el flujo para guardar los adjuntos.'
              }
              className={cn(rowMenuItem, !row.hasDownloadableFileData && rowMenuItemDisabled)}
              onClick={() => void handleDownloadResources()}
            >
              <ArrowDownTrayIcon className={rowMenuIcon} strokeWidth={1.5} aria-hidden />
              Descargar recursos adjuntos
            </button>
          ) : null}
        </div>
      </>,
      document.body,
    )

  return (
    <div className="flex justify-center">
      <button
        ref={btnRef}
        type="button"
        className={rowMenuTrigger}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Acciones de la sesión"
        aria-label="Acciones de la sesión"
        onClick={toggle}
      >
        <EllipsisVerticalIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </button>
      {portal}
    </div>
  )
}

function SortHeaderButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-start gap-1 text-left hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB]"
    >
      <span>{label}</span>
      {active ? (
        dir === 'asc' ? (
          <ChevronUpIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        ) : (
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        )
      ) : (
        <span className="inline-flex shrink-0 flex-col opacity-30" aria-hidden>
          <ChevronUpIcon className="-mb-1 h-2.5 w-2.5" />
          <ChevronDownIcon className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  )
}

function DetailQuestionsTable({
  flowId,
  flowName,
  detailTable,
}: {
  flowId: string
  flowName: string
  detailTable: FlowResultsDetailTable
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'completedAt',
    dir: 'desc',
  })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(15)

  const searchTrim = search.trim()

  const filteredSorted = useMemo(() => {
    let list = [...detailTable.rows]
    if (searchTrim) {
      const q = searchTrim.toLowerCase()
      list = list.filter((r) => r.displayName.toLowerCase().includes(q))
    }
    list.sort((a, b) => compareDetailRows(a, b, sort.key, sort.dir))
    return list
  }, [detailTable.rows, searchTrim, sort.key, sort.dir])

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * pageSize
  const pageRows = filteredSorted.slice(start, start + pageSize)
  const fromN = filteredSorted.length === 0 ? 0 : start + 1
  const toN = filteredSorted.length === 0 ? 0 : Math.min(start + pageSize, filteredSorted.length)

  useEffect(() => {
    setPage(0)
  }, [searchTrim, sort.key, sort.dir, pageSize])

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1))
  }, [pageCount])

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'completedAt' || key === 'score' ? 'desc' : 'asc' },
    )
  }

  const handleExportExcel = useCallback(async () => {
    if (filteredSorted.length === 0) return
    try {
      await downloadDetailTableExcel(filteredSorted, detailTable, flowName)
    } catch {
      /* export opcional; fallos silenciosos */
    }
  }, [filteredSorted, detailTable, flowName])

  const stickyThLeft = cn(
    thBase,
    'sticky left-0 z-40 min-w-[7.5rem] shadow-[3px_0_10px_-4px_rgba(0,0,0,0.12)] dark:shadow-[3px_0_12px_-4px_rgba(0,0,0,0.45)]',
  )
  const stickyTdLeft = cn(
    tdBase,
    'sticky left-0 z-10 bg-white shadow-[3px_0_10px_-4px_rgba(0,0,0,0.1)] group-hover:bg-[#F8F6FF] dark:bg-[#1A1D29] dark:shadow-[3px_0_12px_-4px_rgba(0,0,0,0.35)] dark:group-hover:bg-[#1c1f2a]',
  )
  const stickyThRight = cn(
    thBase,
    'sticky right-0 z-40 w-[7.5rem] min-w-[7.5rem] text-center shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[-8px_0_14px_-4px_rgba(0,0,0,0.45)]',
  )
  const stickyTdRight = cn(
    tdBase,
    'sticky right-0 z-10 bg-white text-center shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.1)] group-hover:bg-[#F8F6FF] dark:bg-[#1A1D29] dark:shadow-[-8px_0_14px_-4px_rgba(0,0,0,0.35)] dark:group-hover:bg-[#1c1f2a]',
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:flex-nowrap sm:gap-3">
          <div className="min-w-0 max-w-md flex-1 sm:min-w-48">
            <label htmlFor="results-detail-search" className="sr-only">
              Buscar por nombre
            </label>
            <input
              id="results-detail-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none ring-[#9C77F5]/30 focus:border-[#9C77F5] focus:ring-2 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#F8F9FB]"
            />
          </div>
          <button
            type="button"
            disabled={filteredSorted.length === 0}
            onClick={() => void handleExportExcel()}
            title={
              filteredSorted.length === 0
                ? 'No hay filas para exportar'
                : 'Descargar Excel con el detalle filtrado y ordenado'
            }
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors sm:px-4',
              'border-[#9C77F5]/25 bg-[#9C77F5]/10 text-[#5B3EC9] ring-[#9C77F5]/15',
              'hover:border-[#9C77F5]/45 hover:bg-[#9C77F5]/16 hover:text-[#4A2FA8]',
              'dark:border-[#9C77F5]/35 dark:bg-[#9C77F5]/14 dark:text-[#E4D9FC]',
              'dark:hover:border-[#9C77F5]/50 dark:hover:bg-[#9C77F5]/22 dark:hover:text-[#F8F5FF]',
              'disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
            )}
          >
            <TableCellsIcon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={1.5} aria-hidden />
            Excel
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          <span className="whitespace-nowrap">Por página</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
          >
            {[10, 15, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#E8EAEF] dark:border-[#2A2F3F]">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-max min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-30">
              <tr>
                <th scope="col" className={stickyThLeft}>
                  <SortHeaderButton
                    label="Clasificación"
                    active={sort.key === 'classification'}
                    dir={sort.dir}
                    onClick={() => toggleSort('classification')}
                  />
                </th>
                {detailTable.hasScores ? (
                  <th scope="col" className={cn(thBase, 'whitespace-nowrap tabular-nums')}>
                    <SortHeaderButton
                      label="Score"
                      active={sort.key === 'score'}
                      dir={sort.dir}
                      onClick={() => toggleSort('score')}
                    />
                  </th>
                ) : null}
                <th scope="col" className={cn(thBase, 'whitespace-nowrap')}>
                  <SortHeaderButton
                    label="Fecha"
                    active={sort.key === 'completedAt'}
                    dir={sort.dir}
                    onClick={() => toggleSort('completedAt')}
                  />
                </th>
                <th
                  scope="col"
                  className={cn(
                    thBase,
                    'min-w-32-w-[14rem] whitespace-normal font-medium normal-case tracking-normal text-[#4B5563] dark:text-[#9CA3AF]',
                  )}
                >
                  <SortHeaderButton
                    label="Nombre"
                    active={sort.key === 'displayName'}
                    dir={sort.dir}
                    onClick={() => toggleSort('displayName')}
                  />
                </th>
                {detailTable.contactColumns.map((c) => (
                  <th key={c.key} scope="col" className={cn(thBase, 'max-w-40 whitespace-normal')}>
                    {c.label}
                  </th>
                ))}
                {detailTable.stepColumns.map((c) => (
                  <th
                    key={c.stepId}
                    scope="col"
                    title={c.fullQuestion}
                    className={cn(
                      thBase,
                      'min-w-40 max-w-[16rem] whitespace-normal font-medium normal-case tracking-normal text-[#4B5563] dark:text-[#9CA3AF]',
                    )}
                  >
                    {c.header}
                  </th>
                ))}
                <th scope="col" className={stickyThRight}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.sessionId} className="group bg-white dark:bg-[#1A1D29]">
                  <td className={stickyTdLeft}>
                    <ClassificationBadge value={r.classification} />
                  </td>
                  {detailTable.hasScores ? (
                    <td className={cn(tdBase, 'whitespace-nowrap tabular-nums')}>
                      {r.score != null ? r.score : '—'}
                    </td>
                  ) : null}
                  <td className={cn(tdBase, 'whitespace-nowrap text-xs tabular-nums text-[#4B5563] dark:text-[#9CA3AF]')}>
                    {formatTableDate(r.completedAt)}
                  </td>
                  <td className={cn(tdBase, 'max-w-56 text-xs wrap-break-word')}>
                    {r.displayName || '—'}
                  </td>
                  {detailTable.contactColumns.map((c) => (
                    <td key={c.key} className={cn(tdBase, 'max-w-48 wrap-break-word text-xs')}>
                      {r.contact[c.key] ?? '—'}
                    </td>
                  ))}
                  {detailTable.stepColumns.map((c) => (
                    <td key={c.stepId} className={cn(tdBase, 'min-w-40 max-w-[16rem] wrap-break-word text-xs')}>
                      {r.stepCells[c.stepId] ?? '—'}
                    </td>
                  ))}
                  <td className={stickyTdRight}>
                    <DetailSessionRowMenu flowId={flowId} row={r} detailTable={detailTable} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2.5 text-sm dark:border-[#2A2F3F] dark:bg-[#161821]">
          <p className="text-[#6B7280] dark:text-[#9CA3AF]">
            {filteredSorted.length === 0 ? (
              'Sin resultados'
            ) : (
              <>
                Mostrando <span className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">{fromN}</span>–
                <span className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">{toN}</span> de{' '}
                <span className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">{filteredSorted.length}</span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#374151] disabled:opacity-40 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#D1D5DB]"
            >
              Anterior
            </button>
            <span className="tabular-nums text-[#6B7280] dark:text-[#9CA3AF]">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#374151] disabled:opacity-40 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#D1D5DB]"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FlowResultsView({
  flowId,
  flowName,
  rows,
  analytics,
  detailTable,
}: {
  flowId: string
  flowName: string
  rows: FlowResultRow[]
  analytics: FlowResultsAnalytics
  detailTable: FlowResultsDetailTable
}) {
  const sp = useSearchParams()
  const tab = parseTab(sp.get('tab'))
  const base = `/dashboard/flows/${flowId}/results`

  const total = rows.length
  const hot = rows.filter((r) => r.classification === 'hot').length
  const warm = rows.filter((r) => r.classification === 'warm').length
  const cold = rows.filter((r) => r.classification === 'cold').length
  const unclassified = total - hot - warm - cold
  const scores = rows.map((r) => r.score).filter((s): s is number => s != null)
  const avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null

  return (
    <div
      className={cn(
        'mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 pt-8 sm:px-6 lg:px-8',
        tab === 'detalle' ? 'pb-[25px]' : 'pb-8',
      )}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Resultados</p>
          <h1 className="mt-1 text-xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">{flowName}</h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Sesiones completadas con resumen y scoring generados al cerrar la conversación pública.
          </p>
        </div>
        <Link
          href={`/dashboard/flows/${flowId}`}
          className="shrink-0 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F9FAFB] dark:border-[#2A2F3F] dark:text-[#9CA3AF] dark:hover:bg-[#252936]"
        >
          ← Volver al editor
        </Link>
      </div>

      <nav
        className="-mx-1 flex shrink-0 gap-1 border-b border-[#E8EAEF] dark:border-[#2A2F3F]"
        aria-label="Secciones de resultados"
      >
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <Link
              key={t.id}
              href={`${base}?tab=${t.id}`}
              scroll={false}
              prefetch
              className={cn(
                'relative -mb-px px-4 py-2.5 text-sm font-semibold transition-colors',
                active
                  ? 'text-[#9C77F5] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#9C77F5]'
                  : 'text-[#6B7280] hover:text-[#1A1A1A] dark:text-[#9CA3AF] dark:hover:text-[#F8F9FB]',
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {tab === 'detalle' && total === 0 ? (
        <p className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] px-4 py-8 text-center text-sm text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#94A3B8]">
          Aún no hay sesiones completadas. Cuando alguien termine el flow público, aparecerán aquí con el resumen y la
          clasificación.
        </p>
      ) : tab === 'resumen' ? (
        <ResumenPanels analytics={analytics} />
      ) : tab === 'metricas' ? (
        <div className="flex flex-col gap-6">
          {total === 0 ? (
            <p className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] px-4 py-8 text-center text-sm text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#94A3B8]">
              Sin sesiones completadas todavía. Las métricas de clasificación aparecerán cuando haya datos.
            </p>
          ) : null}
          {total > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Hot" value={hot} hint="Alta intención" accent="text-orange-600 dark:text-orange-300" />
                <MetricCard label="Warm" value={warm} hint="Interés medio" accent="text-amber-600 dark:text-amber-200" />
                <MetricCard label="Cold" value={cold} hint="Baja prioridad" accent="text-slate-600 dark:text-slate-300" />
                <MetricCard
                  label="Sin clasificar"
                  value={unclassified}
                  hint="Sin etiqueta aún"
                  accent="text-[#6B7280] dark:text-[#9CA3AF]"
                />
              </div>
              <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#FAFBFC] px-4 py-10 text-center dark:border-[#3B4255] dark:bg-[#161821]">
                <p className="text-sm font-medium text-[#4B5563] dark:text-[#9CA3AF]">Gráficos y tendencias</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  Aquí podremos enlazar funnels y series temporales cuando definamos métricas.
                </p>
              </div>
              {avgScore != null ? (
                <div className="rounded-2xl border border-[#E8EAEF] bg-white p-5 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Score medio</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-[#9C77F5]">{avgScore}</p>
                  <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                    Sobre {scores.length} sesión{scores.length === 1 ? '' : 'es'} con puntuación
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <DetailQuestionsTable flowId={flowId} flowName={flowName} detailTable={detailTable} />
      )}
      </div>
    </div>
  )
}

function ResumenPanels({ analytics }: { analytics: FlowResultsAnalytics }) {
  if (!analytics.hasAnySessions) {
    return (
      <p className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] px-4 py-8 text-center text-sm text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#94A3B8]">
        Aún no hay visitas a este flow. Cuando se registren sesiones, verás indicadores y respuestas por pregunta aquí.
      </p>
    )
  }

  const card = 'rounded-2xl border border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]'
  const head = 'border-b border-[#E8EAEF] px-5 py-4 dark:border-[#2A2F3F]'
  const body = 'px-5 py-5'

  return (
    <div className="flex flex-col gap-8">
      <section className={card}>
        <header className={head}>
          <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Indicadores clave</h2>
        </header>
        <div className={body}>
          <div className="grid gap-6 lg:grid-cols-3">
            <KpiWithSpark
              label="Visitas"
              value={analytics.visits30d}
              sparkline={analytics.visitsSparkline}
            />
            <KpiWithSpark
              label="Parciales"
              value={analytics.partial30d}
              sparkline={analytics.partialSparkline}
            />
            <KpiWithSpark
              label="Completadas"
              value={analytics.completed30d}
              sparkline={analytics.completedSparkline}
            />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SmallMetric
              label="Tasa de conversión"
              value={`${analytics.conversionPct.toFixed(2)}%`}
              hintTitle="Sesiones completadas respecto al total de sesiones registradas."
            />
            <SmallMetric
              label="Tasa de finalización"
              value={`${analytics.completionPct.toFixed(2)}%`}
              hintTitle="Completadas entre el total que llegó al funnel (completadas + parciales)."
            />
            <SmallMetric label="Tiempo medio" value={formatAvgDuration(analytics.avgDurationMs)} />
            <SmallMetric
              label="Resp. medias / sesión"
              value={analytics.avgAnswersPerSession != null ? String(analytics.avgAnswersPerSession) : '—'}
            />
            <SmallMetric
              label="Score medio"
              value={analytics.avgScore != null ? String(analytics.avgScore) : '—'}
            />
            <SmallMetric
              label="Abandono"
              value={`${analytics.abandonmentPct.toFixed(2)}%`}
              hintTitle="Sesiones no completadas respecto al total de visitas."
            />
          </div>
        </div>
      </section>

      <section className={card}>
        <header className={head}>
          <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Resumen por pregunta</h2>
        </header>
        <div className={cn(body, 'space-y-10')}>
          {analytics.questionSummaries.length === 0 ? (
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">Este flow aún no tiene pasos definidos.</p>
          ) : (
            analytics.questionSummaries.map((q) => (
              <div key={q.stepId} className="border-b border-[#F3F4F6] pb-10 last:border-0 last:pb-0 dark:border-[#252936]">
                <h3 className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">{q.question}</h3>
                <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  {q.answeredCount} de {q.completedTotal} envíos completados respondieron esta pregunta.
                </p>
                <div className="mt-4 space-y-2.5">
                  {q.options.map((o) => (
                    <div key={o.value} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                      <span className="shrink-0 text-sm text-[#374151] dark:text-[#D1D5DB] sm:w-[min(40%,14rem)]">
                        {o.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex h-9 w-full items-center justify-between gap-3 rounded-full bg-[#E8F0FE] px-3 text-sm dark:bg-[#1e3a5f]/40">
                          <span className="font-semibold tabular-nums text-[#1E40AF] dark:text-[#93C5FD]">
                            {o.pct.toFixed(1)}%
                          </span>
                          <span className="truncate text-xs tabular-nums text-[#64748B] dark:text-[#94A3B8]">
                            {o.count} envío{o.count === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function KpiWithSpark({ label, value, sparkline }: { label: string; value: number; sparkline: number[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">{label}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <p className="text-3xl font-bold tabular-nums text-[#1A1A1A] dark:text-[#F8F9FB]">{value}</p>
        <div className="text-right text-[10px] leading-tight text-[#9CA3AF]">
          <span className="block">Cifra: últimos 30 días</span>
          <span className="block">Serie: 7 días · sin comparativa</span>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-[#F8FAFC] px-2 py-2 dark:bg-[#0f1419]">
        <MiniSparkline values={sparkline} />
      </div>
    </div>
  )
}

function SmallMetric({
  label,
  value,
  hintTitle,
}: {
  label: string
  value: string
  hintTitle?: string
}) {
  return (
    <div className="rounded-xl border border-[#F3F4F6] bg-[#FAFBFC] px-3 py-3 dark:border-[#2A2F3F] dark:bg-[#161821]">
      <p className="flex items-center gap-1 text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
        {label}
        {hintTitle ? <MetricHint title={hintTitle} /> : null}
      </p>
      <p className="mt-2 text-lg font-semibold tabular-nums text-[#1A1A1A] dark:text-[#F8F9FB]">{value}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: number
  hint: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-[#E8EAEF] bg-white p-5 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
      <p className={cn('text-xs font-semibold uppercase tracking-wide', accent)}>{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-[#1A1A1A] dark:text-[#F8F9FB]">{value}</p>
      <p className="mt-1 text-xs text-[#9CA3AF]">{hint}</p>
    </div>
  )
}
