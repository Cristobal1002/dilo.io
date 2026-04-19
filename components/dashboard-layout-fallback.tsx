/**
 * Fallback de `Suspense` del layout del dashboard: evita flash en blanco en conexiones lentas.
 */
export function DashboardLayoutFallback() {
  return (
    <div className="flex min-h-screen bg-background" aria-busy="true" aria-label="Cargando panel">
      <div
        className="relative hidden min-h-screen w-64 shrink-0 animate-pulse flex-col border-r border-border bg-sidenav md:flex"
        aria-hidden
      >
        <div className="h-16 shrink-0 border-b border-border" />
        <div className="flex-1 space-y-2 p-4">
          <div className="h-10 rounded-xl bg-muted/35" />
          <div className="h-10 rounded-xl bg-muted/35" />
          <div className="h-10 rounded-xl bg-muted/35" />
        </div>
        <div className="shrink-0 border-t border-border p-4">
          <div className="h-9 w-full rounded-lg bg-muted/25" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-16 shrink-0 animate-pulse border-b border-border bg-surface" aria-hidden />
        <main className="flex-1 bg-background p-6">
          <div className="mb-6 h-8 w-44 max-w-full rounded-lg bg-muted/30" />
          <div className="h-28 max-w-2xl rounded-2xl bg-muted/25" />
        </main>
      </div>
    </div>
  )
}
