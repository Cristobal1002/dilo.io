'use client'

import { DiloBrandLockup } from '@/components/dilo-brand-lockup'
import { PortalLandingIcon } from '@/components/portal/portal-landing-icon'
import {
  CLIENT_PORTAL_ROLE_LABEL,
  type ClientPortalRole,
} from '@/lib/client-portal-roles'
import {
  getLandingTheme,
  LANDING_PRIMARY,
  LANDING_SECONDARY,
} from '@/lib/landing-theme'

export type PortalTab = 'overview' | 'cases'

export function PortalDashboardHeader({
  branding,
  role,
  memberships,
  activeClientId,
  tab,
  onTabChange,
  onSwitchClient,
  onLogout,
  isDark,
  onToggleTheme,
}: {
  branding: { clientName: string; providerName: string; logoUrl: string | null }
  userEmail: string
  userName: string | null
  role: ClientPortalRole
  memberships: { clientId: string; clientName: string }[]
  activeClientId: string
  tab: PortalTab
  onTabChange: (tab: PortalTab) => void
  onSwitchClient: (clientId: string) => void
  onLogout: () => void
  isDark: boolean
  onToggleTheme: () => void
}) {
  const t = getLandingTheme(isDark, LANDING_PRIMARY, LANDING_SECONDARY)

  return (
    <header
      className="portal-dash-header"
      style={{
        background: t.navBg,
        borderBottom: `1px solid ${t.navBorder}`,
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="portal-dash-header-inner">
        <div className="portal-dash-header-brand">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="portal-dash-client-logo" />
          ) : (
            <DiloBrandLockup imageHeight={36} logoForDarkBackground={isDark} />
          )}
          <div>
            <p className="portal-dash-client-name" style={{ color: t.headingColor }}>
              {branding.clientName}
            </p>
            <p className="portal-dash-provider" style={{ color: t.textSub }}>
              Portal ejecutivo · {branding.providerName}
            </p>
          </div>
        </div>

        <nav className="portal-dash-tabs" aria-label="Secciones del portal">
          {(
            [
              { id: 'overview' as const, label: 'Resumen' },
              { id: 'cases' as const, label: 'Casos' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className="portal-dash-tab"
              style={{
                background: tab === item.id ? t.badgeBg : 'transparent',
                color: tab === item.id ? t.badgeText : t.textSub,
                border: `1px solid ${tab === item.id ? t.badgeBorder : 'transparent'}`,
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="portal-dash-header-actions">
          {memberships.length > 1 ? (
            <select
              value={activeClientId}
              onChange={(e) => onSwitchClient(e.target.value)}
              className="portal-dash-select"
              style={{
                background: t.inputBg,
                borderColor: t.border,
                color: t.text,
              }}
            >
              {memberships.map((m) => (
                <option key={m.clientId} value={m.clientId}>
                  {m.clientName}
                </option>
              ))}
            </select>
          ) : null}
          <span className="portal-dash-meta hidden sm:inline" style={{ color: t.textMuted }}>
            {CLIENT_PORTAL_ROLE_LABEL[role]}
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            className="portal-dash-icon-btn"
            style={{ background: t.toggleBg }}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            <PortalLandingIcon name={isDark ? 'sun' : 'moon'} size={18} color={t.toggleIcon} />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="portal-dash-logout"
            style={{ borderColor: t.border, color: t.textSub }}
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
