'use client'

import { usePortalTheme } from '@/components/portal/portal-theme-context'
import type { PortalDashboardStats } from '@/lib/portal-analytics'
import {
  getLandingTheme,
  LANDING_PRIMARY,
  LANDING_SECONDARY,
} from '@/lib/landing-theme'
import { SUPPORT_PRIORITY_LABEL, supportStatusPillClass } from '@/lib/support'

const P = LANDING_PRIMARY
const S = LANDING_SECONDARY

function KpiCard({
  label,
  value,
  hint,
  accent,
  t,
}: {
  label: string
  value: string
  hint?: string
  accent?: string
  t: ReturnType<typeof getLandingTheme>
}) {
  return (
    <div
      className="portal-dash-kpi landing-card-h"
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
      }}
    >
      <p className="portal-dash-kpi-label" style={{ color: t.textMuted }}>
        {label}
      </p>
      <p className="portal-dash-kpi-value" style={{ color: accent ?? t.headingColor }}>
        {value}
      </p>
      {hint ? (
        <p className="portal-dash-kpi-hint" style={{ color: t.textSub }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function BarChart({
  data,
  t,
}: {
  data: PortalDashboardStats['monthly']
  t: ReturnType<typeof getLandingTheme>
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.resolved]))
  return (
    <div className="portal-dash-chart-bars">
      {data.map((d) => (
        <div key={d.month} className="portal-dash-bar-group">
          <div className="portal-dash-bar-stack">
            <div
              className="portal-dash-bar portal-dash-bar-created"
              style={{
                height: `${Math.max(4, (d.created / max) * 100)}%`,
                background: `linear-gradient(180deg, ${P} 0%, ${P}99 100%)`,
              }}
              title={`${d.created} creados`}
            />
            <div
              className="portal-dash-bar portal-dash-bar-resolved"
              style={{
                height: `${Math.max(4, (d.resolved / max) * 100)}%`,
                background: `linear-gradient(180deg, ${S} 0%, ${S}99 100%)`,
              }}
              title={`${d.resolved} resueltos`}
            />
          </div>
          <span className="portal-dash-bar-label" style={{ color: t.textMuted }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PortalDashboardOverview({ stats }: { stats: PortalDashboardStats }) {
  const { isDark } = usePortalTheme()
  const t = getLandingTheme(isDark, P, S)
  const { contract, kpis, byStatus, monthly, compare } = stats

  const hoursHint =
    kpis.hoursDeltaPct != null
      ? `${kpis.hoursDeltaPct >= 0 ? '+' : ''}${kpis.hoursDeltaPct}% vs mes anterior`
      : kpis.hoursLastMonth === 0 && kpis.hoursThisMonth === 0
        ? 'Sin horas registradas'
        : undefined

  const totalStatus = byStatus.reduce((s, x) => s + x.count, 0) || 1

  return (
    <div className="portal-dash-overview">
      <div className="portal-dash-kpi-grid">
        <KpiCard t={t} label="Casos abiertos" value={String(kpis.open)} hint="En curso ahora" accent={P} />
        <KpiCard
          t={t}
          label="Resueltos (30 días)"
          value={String(kpis.resolvedLast30)}
          hint="Cerrados recientemente"
          accent={S}
        />
        <KpiCard
          t={t}
          label="Horas este mes"
          value={`${kpis.hoursThisMonth} h`}
          hint={hoursHint}
        />
        <KpiCard
          t={t}
          label="Entrega a tiempo"
          value={kpis.onTimePct != null ? `${kpis.onTimePct}%` : '—'}
          hint={
            kpis.avgResolutionDays != null
              ? `Promedio ${kpis.avgResolutionDays} días de resolución`
              : 'Sin datos de SLA aún'
          }
        />
      </div>

      <div className="portal-dash-main-grid">
        <section
          className="portal-dash-panel"
          style={{ background: t.cardBg, border: `1px solid ${t.border}` }}
        >
          <div className="portal-dash-panel-head">
            <div>
              <h2 className="portal-dash-panel-title" style={{ color: t.headingColor }}>
                Volumen de casos
              </h2>
              <p className="portal-dash-panel-sub" style={{ color: t.textSub }}>
                Últimos 6 meses · creados vs resueltos
              </p>
            </div>
            <div className="portal-dash-legend">
              <span style={{ color: t.textSub }}>
                <i className="portal-dash-legend-dot" style={{ background: P }} /> Creados
              </span>
              <span style={{ color: t.textSub }}>
                <i className="portal-dash-legend-dot" style={{ background: S }} /> Resueltos
              </span>
            </div>
          </div>
          <BarChart data={monthly} t={t} />
        </section>

        <aside
          className="portal-dash-panel portal-dash-contract"
          style={{
            background: t.cardBg2,
            border: `1px solid ${t.border}`,
          }}
        >
          <div
            className="portal-dash-plan-badge"
            style={{
              background: t.badgeBg,
              border: `1px solid ${t.badgeBorder}`,
              color: t.badgeText,
            }}
          >
            Plan {contract.label}
          </div>
          <p className="portal-dash-contract-tagline" style={{ color: t.textSub }}>
            {contract.tagline}
          </p>
          <dl className="portal-dash-contract-dl">
            <div>
              <dt style={{ color: t.textMuted }}>Horario de atención</dt>
              <dd style={{ color: t.headingColor }}>{contract.businessHoursDisplay}</dd>
            </div>
            <div>
              <dt style={{ color: t.textMuted }}>SLA de respuesta</dt>
              <dd style={{ color: t.headingColor }}>{contract.responseSla}</dd>
            </div>
            <div>
              <dt style={{ color: t.textMuted }}>Canales</dt>
              <dd style={{ color: t.headingColor }}>{contract.channels}</dd>
            </div>
            <div>
              <dt style={{ color: t.textMuted }}>Cobertura</dt>
              <dd style={{ color: t.headingColor }}>{contract.coverage}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="portal-dash-secondary-grid">
        <section
          className="portal-dash-panel"
          style={{ background: t.cardBg, border: `1px solid ${t.border}` }}
        >
          <h2 className="portal-dash-panel-title" style={{ color: t.headingColor }}>
            Distribución por estado
          </h2>
          <ul className="portal-dash-status-list">
            {byStatus.map((row) => (
              <li key={row.status}>
                <div className="portal-dash-status-row">
                  <span className={supportStatusPillClass(row.status)}>{row.label}</span>
                  <span style={{ color: t.headingColor, fontWeight: 700 }}>{row.count}</span>
                </div>
                <div className="portal-dash-progress-track" style={{ background: t.pillBg }}>
                  <div
                    className="portal-dash-progress-fill"
                    style={{
                      width: `${(row.count / totalStatus) * 100}%`,
                      background: `linear-gradient(90deg, ${P}, ${S})`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="portal-dash-panel"
          style={{ background: t.cardBg, border: `1px solid ${t.border}` }}
        >
          <h2 className="portal-dash-panel-title" style={{ color: t.headingColor }}>
            Comparativo mensual
          </h2>
          <p className="portal-dash-panel-sub mb-4" style={{ color: t.textSub }}>
            Mes actual vs mes anterior
          </p>
          <div className="portal-dash-compare-grid">
            <div className="portal-dash-compare-col" style={{ borderColor: t.border }}>
              <p className="portal-dash-compare-label" style={{ color: t.textMuted }}>
                Este mes
              </p>
              <p className="portal-dash-compare-stat" style={{ color: t.headingColor }}>
                {compare.thisMonth.created}
                <span style={{ color: t.textSub, fontSize: 13, fontWeight: 500 }}> nuevos</span>
              </p>
              <p className="portal-dash-compare-stat" style={{ color: S }}>
                {compare.thisMonth.resolved}
                <span style={{ color: t.textSub, fontSize: 13, fontWeight: 500 }}> resueltos</span>
              </p>
            </div>
            <div className="portal-dash-compare-col" style={{ borderColor: t.border }}>
              <p className="portal-dash-compare-label" style={{ color: t.textMuted }}>
                Mes anterior
              </p>
              <p className="portal-dash-compare-stat" style={{ color: t.headingColor }}>
                {compare.lastMonth.created}
                <span style={{ color: t.textSub, fontSize: 13, fontWeight: 500 }}> nuevos</span>
              </p>
              <p className="portal-dash-compare-stat" style={{ color: S }}>
                {compare.lastMonth.resolved}
                <span style={{ color: t.textSub, fontSize: 13, fontWeight: 500 }}> resueltos</span>
              </p>
            </div>
          </div>
          {stats.byPriority.length > 0 ? (
            <div className="portal-dash-priority-row">
              {stats.byPriority.map((p) => (
                <span
                  key={p.priority}
                  className="portal-dash-priority-chip"
                  style={{
                    background: t.pillBg,
                    border: `1px solid ${t.pillBorder}`,
                    color: t.pillText,
                  }}
                >
                  {SUPPORT_PRIORITY_LABEL[p.priority]} · {p.count}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
