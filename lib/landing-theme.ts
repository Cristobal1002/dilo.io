/** Tokens visuales compartidos con la landing de Dilo. */
export const LANDING_PRIMARY = '#7C3AED'
export const LANDING_SECONDARY = '#06B6D4'

export type LandingThemeTokens = ReturnType<typeof getLandingTheme>

export function getLandingTheme(dark: boolean, p = LANDING_PRIMARY, s = LANDING_SECONDARY) {
  if (dark) {
    return {
      dark,
      pageBg: '#0D0720',
      altBg: '#0A0518',
      cardBg: '#130A28',
      cardBg2: '#160D2E',
      border: 'rgba(124,58,237,.18)',
      borderHover: 'rgba(124,58,237,.4)',
      text: '#fff',
      textSub: 'rgba(255,255,255,.55)',
      textMuted: 'rgba(255,255,255,.3)',
      textLabel: s,
      navBg: 'rgba(13,7,32,.9)',
      navBorder: 'rgba(124,58,237,.12)',
      navLink: 'rgba(255,255,255,.55)',
      heroGlow: `${p}22`,
      heroGlow2: `${s}12`,
      headingColor: '#fff',
      toggleBg: 'rgba(255,255,255,.08)',
      toggleIcon: 'rgba(255,255,255,.7)',
      badgeBg: 'rgba(124,58,237,.15)',
      badgeBorder: `${p}40`,
      badgeText: '#C4B5FD',
      pillBg: 'rgba(255,255,255,.06)',
      pillBorder: 'rgba(255,255,255,.1)',
      pillText: 'rgba(255,255,255,.7)',
      gradClass: 'landing-grad-text',
      formGood: 'rgba(124,58,237,.08)',
      formGoodBorder: 'rgba(124,58,237,.2)',
      formBad: 'rgba(239,68,68,.06)',
      formBadBorder: 'rgba(239,68,68,.15)',
      formBadText: '#F87171',
      footerBg: '#060311',
      footerBorder: 'rgba(124,58,237,.08)',
      inputBg: '#160D2E',
    } as const
  }

  return {
    dark,
    pageBg: '#F4F1FF',
    altBg: '#FFFFFF',
    cardBg: '#FFFFFF',
    cardBg2: '#F9F7FF',
    border: 'rgba(124,58,237,.1)',
    borderHover: 'rgba(124,58,237,.3)',
    text: '#111827',
    textSub: '#6B7280',
    textMuted: '#9CA3AF',
    textLabel: p,
    navBg: 'rgba(244,241,255,.92)',
    navBorder: 'rgba(124,58,237,.1)',
    navLink: '#6B7280',
    heroGlow: `${p}12`,
    heroGlow2: `${s}08`,
    headingColor: '#111827',
    toggleBg: 'rgba(124,58,237,.08)',
    toggleIcon: p,
    badgeBg: '#EDE9FE',
    badgeBorder: `${p}30`,
    badgeText: p,
    pillBg: '#EDE9FE',
    pillBorder: `${p}20`,
    pillText: p,
    gradClass: 'landing-grad-text-light',
    formGood: '#F5F3FF',
    formGoodBorder: `${p}25`,
    formBad: '#FEF2F2',
    formBadBorder: '#FECACA',
    formBadText: '#EF4444',
    footerBg: '#1A0B3B',
    footerBorder: 'rgba(124,58,237,.12)',
    inputBg: '#FFFFFF',
  } as const
}

export const PORTAL_THEME_KEY = 'dilo-theme'

export function readPortalMarketingDark(): boolean {
  if (typeof window === 'undefined') return true
  const saved = localStorage.getItem(PORTAL_THEME_KEY)
  if (saved === 'light') return false
  if (saved === 'dark') return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function persistPortalMarketingDark(dark: boolean) {
  localStorage.setItem(PORTAL_THEME_KEY, dark ? 'dark' : 'light')
}
