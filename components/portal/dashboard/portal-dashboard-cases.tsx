'use client'

import { usePortalTheme } from '@/components/portal/portal-theme-context'
import { DiloBrandLockup } from '@/components/dilo-brand-lockup'
import { PortalLandingIcon } from '@/components/portal/portal-landing-icon'
import {
  CLIENT_PORTAL_ROLE_LABEL,
  canPortalEditNotes,
  canPortalEditPriority,
  type ClientPortalRole,
} from '@/lib/client-portal-roles'
import {
  getLandingTheme,
  LANDING_PRIMARY,
  LANDING_SECONDARY,
} from '@/lib/landing-theme'
import {
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_STATUS_LABEL,
  supportPriorityPillClass,
  supportStatusPillClass,
  type SupportPriority,
  type SupportStatus,
} from '@/lib/support'
import { cn } from '@/lib/utils'

export type PortalCaseItem = {
  id: string
  caseNumber: number
  subject: string
  description: string | null
  status: SupportStatus
  priority: SupportPriority
  reportedPriority: SupportPriority
  type: string
  requesterName: string | null
  requesterEmail: string | null
  clientNotes: string | null
  resolutionNotes: string | null
  dueAt: string | null
  lastActivityAt: string
  createdAt: string
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    )
  } catch {
    return '—'
  }
}

export function PortalDashboardCases({
  cases,
  role,
  filter,
  selectedId,
  noteDraft,
  busy,
  err,
  onFilterChange,
  onSelect,
  onNoteDraftChange,
  onPatch,
}: {
  cases: PortalCaseItem[]
  role: ClientPortalRole
  filter: 'open' | 'all'
  selectedId: string | null
  noteDraft: string
  busy: boolean
  err: string | null
  onFilterChange: (f: 'open' | 'all') => void
  onSelect: (id: string | null) => void
  onNoteDraftChange: (v: string) => void
  onPatch: (caseId: string, body: Record<string, unknown>) => void
}) {
  const { isDark } = usePortalTheme()
  const t = getLandingTheme(isDark, LANDING_PRIMARY, LANDING_SECONDARY)
  const selected = cases.find((c) => c.id === selectedId) ?? null

  return (
    <div className="portal-dash-cases-grid">
      <section
        className="portal-dash-panel"
        style={{ background: t.cardBg, border: `1px solid ${t.border}` }}
      >
        <div className="portal-dash-cases-head">
          <div>
            <h2 className="portal-dash-panel-title" style={{ color: t.headingColor }}>
              Casos de soporte
            </h2>
            <p className="portal-dash-panel-sub" style={{ color: t.textSub }}>
              Seguimiento operativo en tiempo real
            </p>
          </div>
          <div className="portal-dash-filter-row">
            {(['open', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                className="portal-dash-filter-btn"
                style={{
                  background: filter === f ? LANDING_PRIMARY : t.pillBg,
                  color: filter === f ? '#fff' : t.pillText,
                  border: `1px solid ${filter === f ? LANDING_PRIMARY : t.pillBorder}`,
                }}
              >
                {f === 'open' ? 'Abiertos' : 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {err ? (
          <p className="portal-dash-error" style={{ color: t.formBadText }}>
            {err}
          </p>
        ) : null}

        {cases.length === 0 ? (
          <p className="portal-dash-empty" style={{ color: t.textSub }}>
            No hay casos en esta vista.
          </p>
        ) : (
          <ul className="portal-dash-case-list">
            {cases.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="portal-dash-case-row"
                  style={{
                    background: selectedId === c.id ? t.formGood : 'transparent',
                    borderColor: selectedId === c.id ? t.formGoodBorder : 'transparent',
                  }}
                >
                  <div>
                    <p className="portal-dash-case-num" style={{ color: t.textMuted }}>
                      #{c.caseNumber}
                    </p>
                    <p className="portal-dash-case-subject" style={{ color: t.headingColor }}>
                      {c.subject}
                    </p>
                    <p className="portal-dash-case-meta" style={{ color: t.textSub }}>
                      {c.requesterName ?? '—'} · {formatDate(c.lastActivityAt)}
                    </p>
                  </div>
                  <div className="portal-dash-case-badges">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', supportStatusPillClass(c.status))}>
                      {SUPPORT_STATUS_LABEL[c.status]}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', supportPriorityPillClass(c.priority))}>
                      {SUPPORT_PRIORITY_LABEL[c.priority]}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside
        className="portal-dash-panel portal-dash-case-detail"
        style={{ background: t.cardBg2, border: `1px solid ${t.border}` }}
      >
        {!selected ? (
          <p className="portal-dash-empty" style={{ color: t.textSub }}>
            Selecciona un caso para ver el detalle.
          </p>
        ) : (
          <div className="portal-dash-detail-body">
            <div>
              <p className="portal-dash-case-num" style={{ color: t.textMuted }}>
                Caso #{selected.caseNumber}
              </p>
              <h3 className="portal-dash-detail-title" style={{ color: t.headingColor }}>
                {selected.subject}
              </h3>
            </div>
            {selected.description ? (
              <p className="portal-dash-detail-desc" style={{ color: t.textSub }}>
                {selected.description}
              </p>
            ) : null}
            <dl className="portal-dash-detail-dl">
              <div>
                <dt style={{ color: t.textMuted }}>Estado</dt>
                <dd style={{ color: t.headingColor }}>{SUPPORT_STATUS_LABEL[selected.status]}</dd>
              </div>
              <div>
                <dt style={{ color: t.textMuted }}>Urgencia reportada</dt>
                <dd style={{ color: t.headingColor }}>
                  {SUPPORT_PRIORITY_LABEL[selected.reportedPriority]}
                </dd>
              </div>
              <div>
                <dt style={{ color: t.textMuted }}>Entrega estimada</dt>
                <dd style={{ color: t.headingColor }}>{formatDate(selected.dueAt)}</dd>
              </div>
              <div>
                <dt style={{ color: t.textMuted }}>Solicitante</dt>
                <dd style={{ color: t.headingColor }}>{selected.requesterName ?? '—'}</dd>
              </div>
            </dl>

            {canPortalEditPriority(role) ? (
              <div>
                <label className="portal-dash-field-label" style={{ color: t.textLabel }}>
                  Prioridad operativa
                </label>
                <select
                  value={selected.priority}
                  disabled={busy}
                  onChange={(e) => onPatch(selected.id, { priority: e.target.value })}
                  className="portal-dash-input"
                  style={{
                    background: t.inputBg,
                    borderColor: t.border,
                    color: t.text,
                  }}
                >
                  {SUPPORT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {SUPPORT_PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <p className="portal-dash-field-label" style={{ color: t.textMuted }}>
                  Prioridad operativa
                </p>
                <p style={{ color: t.headingColor, fontWeight: 600 }}>
                  {SUPPORT_PRIORITY_LABEL[selected.priority]}
                </p>
              </div>
            )}

            {selected.resolutionNotes &&
            (selected.status === 'resolved' || selected.status === 'closed') ? (
              <div>
                <p className="portal-dash-field-label" style={{ color: t.textMuted }}>
                  Resolución
                </p>
                <p className="portal-dash-detail-desc whitespace-pre-wrap" style={{ color: t.textSub }}>
                  {selected.resolutionNotes}
                </p>
              </div>
            ) : null}

            {canPortalEditNotes(role) ? (
              <div>
                <label className="portal-dash-field-label" style={{ color: t.textLabel }}>
                  Nota para el equipo
                </label>
                <textarea
                  value={noteDraft}
                  onChange={(e) => onNoteDraftChange(e.target.value)}
                  rows={3}
                  className="portal-dash-input portal-dash-textarea"
                  style={{
                    background: t.inputBg,
                    borderColor: t.border,
                    color: t.text,
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPatch(selected.id, { clientNotes: noteDraft })}
                  className="portal-dash-primary-btn"
                  style={{ background: LANDING_PRIMARY }}
                >
                  Guardar nota
                </button>
              </div>
            ) : selected.clientNotes ? (
              <div>
                <p className="portal-dash-field-label" style={{ color: t.textMuted }}>
                  Nota del cliente
                </p>
                <p className="portal-dash-detail-desc whitespace-pre-wrap" style={{ color: t.textSub }}>
                  {selected.clientNotes}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  )
}

export function PortalDashboardFooter() {
  const { isDark } = usePortalTheme()
  const t = getLandingTheme(isDark, LANDING_PRIMARY, LANDING_SECONDARY)
  return (
    <footer
      className="portal-dash-footer"
      style={{
        borderTop: `1px solid ${t.footerBorder}`,
        background: t.footerBg,
      }}
    >
      <DiloBrandLockup imageHeight={28} logoForDarkBackground />
      <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 12 }}>
        Portal de soporte · Powered by Dilo
      </p>
    </footer>
  )
}
