/**
 * Se muestra mientras Next resuelve la nueva ruta del panel (sustituye a `children` del layout).
 * Evita la sensación de “clic sin respuesta” en navegaciones lentas.
 */
export default function DashboardLoading() {
  return (
    <div
      className="flex min-h-[min(60vh,520px)] flex-col items-center justify-center gap-4 px-4 py-12"
      role="status"
      aria-live="polite"
      aria-label="Cargando panel"
    >
      <div className="relative h-10 w-10" aria-hidden>
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#9C77F5] dark:border-[#2A2F3F] dark:border-t-[#9C77F5]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[#374151] dark:text-[#E5E7EB]">Cargando…</p>
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">Preparando esta sección</p>
      </div>
      <div className="h-1 w-48 max-w-[min(100%,20rem)] rounded-full bg-[#9C77F5]/15 dark:bg-[#9C77F5]/20">
        <div className="h-full w-full animate-pulse rounded-full bg-[#9C77F5]/55 dark:bg-[#9C77F5]/50" />
      </div>
    </div>
  )
}
