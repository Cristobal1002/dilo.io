'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import ChatMockAuto from './chat-mock-auto'
import { DiloBrandLockup } from '@/components/dilo-brand-lockup'
import { DiloPhoneField, formatPhoneNumberIntl, isValidPhoneNumber } from '@/components/dilo-phone-field'

/* ── Design tokens ──────────────────────────────────────────── */
const P = '#7C3AED'
const S = '#06B6D4'

type ThemeTokens = ReturnType<typeof getT>

function getT(dark: boolean, p: string, s: string) {
  if (dark) return {
    dark,
    pageBg:     '#0D0720',
    altBg:      '#0A0518',
    cardBg:     '#130A28',
    cardBg2:    '#160D2E',
    border:     'rgba(124,58,237,.18)',
    borderHover:'rgba(124,58,237,.4)',
    text:       '#fff',
    textSub:    'rgba(255,255,255,.55)',
    textMuted:  'rgba(255,255,255,.3)',
    textLabel:  s,
    navBg:      'rgba(13,7,32,.9)',
    navBorder:  'rgba(124,58,237,.12)',
    navLink:    'rgba(255,255,255,.55)',
    gridLine:   'rgba(124,58,237,.04)',
    dot:        `${p}08`,
    statBg:     '#130A28',
    badgeBg:    'rgba(124,58,237,.15)',
    badgeBorder:`${p}40`,
    badgeText:  '#C4B5FD',
    pillBg:     'rgba(255,255,255,.06)',
    pillBorder: 'rgba(255,255,255,.1)',
    pillText:   'rgba(255,255,255,.7)',
    heroGlow:   `${p}22`,
    heroGlow2:  `${s}12`,
    headingColor:'#fff',
    toggleBg:   'rgba(255,255,255,.08)',
    toggleIcon: 'rgba(255,255,255,.7)',
    formBad:    'rgba(239,68,68,.06)',
    formBadBorder:'rgba(239,68,68,.15)',
    formBadText:'#F87171',
    formBadNote:'rgba(239,68,68,.3)',
    formGood:   `rgba(124,58,237,.08)`,
    formGoodBorder:`rgba(124,58,237,.2)`,
    checkBg:    `${p}25`,
    pricingSwitch:'rgba(255,255,255,.05)',
    pricingSwitchBorder:'rgba(255,255,255,.08)',
    pricingInactiveColor:'rgba(255,255,255,.45)',
    footerBg:   '#060311',
    footerBorder:'rgba(124,58,237,.08)',
    gradClass:  'landing-grad-text',
  } as const
  return {
    dark,
    pageBg:     '#F4F1FF',
    altBg:      '#FFFFFF',
    cardBg:     '#FFFFFF',
    cardBg2:    '#F9F7FF',
    border:     'rgba(124,58,237,.1)',
    borderHover:'rgba(124,58,237,.3)',
    text:       '#111827',
    textSub:    '#6B7280',
    textMuted:  '#9CA3AF',
    textLabel:  p,
    navBg:      'rgba(244,241,255,.92)',
    navBorder:  'rgba(124,58,237,.1)',
    navLink:    '#6B7280',
    gridLine:   'rgba(124,58,237,.035)',
    dot:        `${p}07`,
    statBg:     '#FFFFFF',
    badgeBg:    '#EDE9FE',
    badgeBorder:`${p}30`,
    badgeText:  p,
    pillBg:     '#EDE9FE',
    pillBorder: `${p}20`,
    pillText:   p,
    heroGlow:   `${p}12`,
    heroGlow2:  `${s}08`,
    headingColor:'#111827',
    toggleBg:   'rgba(124,58,237,.08)',
    toggleIcon: p,
    formBad:    '#FEF2F2',
    formBadBorder:'#FECACA',
    formBadText:'#EF4444',
    formBadNote:'#FCA5A5',
    formGood:   '#F5F3FF',
    formGoodBorder:`${p}25`,
    checkBg:    '#EDE9FE',
    pricingSwitch:'rgba(124,58,237,.06)',
    pricingSwitchBorder:'rgba(124,58,237,.12)',
    pricingInactiveColor:'#6B7280',
    footerBg:   '#1A0B3B',
    footerBorder:'rgba(124,58,237,.12)',
    gradClass:  'landing-grad-text-light',
  } as const
}

/* ── SVG Icon ───────────────────────────────────────────────── */
const ICONS = {
  chat:   'M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z',
  bolt:   'm3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z',
  funnel: 'M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z',
  pencil: 'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125',
  link:   'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
  inbox:  'M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.1 13.177a2.25 2.25 0 0 0-.1.661Z',
  phone:  'M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3',
  check:  'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  chart:  'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  arrow:  'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99',
  db:     'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
  sun:    'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
  moon:   'M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z',
  user:   'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
}

type IconKey = keyof typeof ICONS
function Icon({ name, size = 20, color = 'currentColor', sw = 1.5 }: { name: IconKey; size?: number; color?: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

/* ── Scroll fade ────────────────────────────────────────────── */
function useFade(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => el.classList.add('in'), delay * 1000); obs.disconnect() }
    }, { threshold: .08 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])
  return ref
}

function Fade({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useFade(delay)
  return <div ref={ref} className="landing-scroll-fade" style={style}>{children}</div>
}

/* ── Animated counter ───────────────────────────────────────── */
function useCounter(target: number, duration = 1400) {
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { setStarted(true); obs.disconnect() } }, { threshold: .3 })
    obs.observe(el); return () => obs.disconnect()
  }, [started])
  useEffect(() => {
    if (!started) return
    const step = target / (duration / 16); let cur = 0
    const t = setInterval(() => { cur = Math.min(cur + step, target); setVal(Math.round(cur)); if (cur >= target) clearInterval(t) }, 16)
    return () => clearInterval(t)
  }, [started, target, duration])
  return [val, ref] as const
}

function StatCounter({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [val, ref] = useCounter(target)
  const display = decimals ? (val / Math.pow(10, decimals)).toFixed(1) : val
  return <span ref={ref}>{display}{suffix}</span>
}

/* ── Nav ────────────────────────────────────────────────────── */
function Nav({ t, isDark, toggleTheme }: { t: ThemeTokens; isDark: boolean; toggleTheme: () => void }) {
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h)
  }, [])

  // Close menu on route navigation (anchor click)
  function closeMenu() { setMenuOpen(false) }

  const navBg    = scrolled || menuOpen ? t.navBg : 'transparent'
  const navBdr   = scrolled || menuOpen ? `1px solid ${t.navBorder}` : 'none'
  const blur     = scrolled || menuOpen ? 'blur(20px)' : 'none'

  const signInBorderIdle = t.dark ? 'rgba(255,255,255,.15)' : t.border

  const HamburgerIcon = () => menuOpen
    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: navBg, backdropFilter: blur, WebkitBackdropFilter: blur, borderBottom: navBdr, transition: 'all .3s ease' }}>
      {/* Main bar */}
      <div style={{ maxWidth: 1140, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        {/* Logo */}
        <DiloBrandLockup
          imageHeight={40}
          gapClassName="gap-[10px]"
          wordmarkClassName="font-bold"
          wordmarkStyle={{ fontSize: 30, color: t.text, letterSpacing: '-.5px' }}
        />

        {/* Desktop links */}
        <div className="landing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(['Cómo funciona', 'Precios'] as const).map(l => (
            <a key={l} href={l === 'Precios' ? '#pricing' : '#como-funciona'} style={{ color: t.navLink, fontSize: 14, fontWeight: 500, textDecoration: 'none', padding: '6px 14px', borderRadius: 8, transition: 'color .2s' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = t.text }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = t.navLink }}
            >{l}</a>
          ))}
          <Link href="/blog" style={{ color: t.navLink, fontSize: 14, fontWeight: 500, textDecoration: 'none', padding: '6px 14px', borderRadius: 8, transition: 'color .2s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.text }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.navLink }}
          >Blog</Link>
          <button onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'} style={{ width: 38, height: 38, borderRadius: 12, background: t.toggleBg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
            <Icon name={isDark ? 'sun' : 'moon'} size={18} color={t.toggleIcon} />
          </button>
          <Link href="/sign-up" style={{ background: P, color: '#fff', borderRadius: 100, padding: '9px 20px', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block', boxShadow: `0 2px 12px ${P}50`, transition: 'opacity .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '.85' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >Crea tu flow gratis</Link>
          <Link
            href="/sign-in"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              marginLeft: 4,
              background: 'transparent',
              color: t.textSub,
              border: `1.5px solid ${signInBorderIdle}`,
              borderRadius: 100,
              padding: '9px 16px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'border-color .2s,color .2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = P
              el.style.color = t.text
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = signInBorderIdle
              el.style.color = t.textSub
            }}
          >
            <Icon name="user" size={17} color="currentColor" />
            Sign in
          </Link>
        </div>

        {/* Mobile right: theme toggle + hamburger */}
        <div className="landing-nav-hamburger" style={{ alignItems: 'center', gap: 8 }}>
          <button onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'} style={{ width: 38, height: 38, borderRadius: 12, background: t.toggleBg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={isDark ? 'sun' : 'moon'} size={18} color={t.toggleIcon} />
          </button>
          <button onClick={() => setMenuOpen(o => !o)} style={{ width: 42, height: 42, borderRadius: 12, background: t.toggleBg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text }}>
            <HamburgerIcon />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`landing-nav-drawer${menuOpen ? ' open' : ''}`} style={{ background: t.navBg, borderBottomColor: t.navBorder }}>
        <a href="#como-funciona" onClick={closeMenu} style={{ display: 'block', padding: '13px 16px', borderRadius: 12, color: t.text, fontSize: 16, fontWeight: 500, textDecoration: 'none', background: 'transparent', transition: 'background .15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.toggleBg }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >Cómo funciona</a>
        <a href="#pricing" onClick={closeMenu} style={{ display: 'block', padding: '13px 16px', borderRadius: 12, color: t.text, fontSize: 16, fontWeight: 500, textDecoration: 'none', background: 'transparent', transition: 'background .15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.toggleBg }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >Precios</a>
        <Link href="/blog" onClick={closeMenu} style={{ display: 'block', padding: '13px 16px', borderRadius: 12, color: t.text, fontSize: 16, fontWeight: 500, textDecoration: 'none', background: 'transparent', transition: 'background .15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.toggleBg }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >Blog</Link>
        <div style={{ height: 1, background: t.border, margin: '8px 0' }} />
        <Link href="/sign-up" onClick={closeMenu} style={{ display: 'block', background: P, color: '#fff', borderRadius: 14, padding: '14px 20px', fontSize: 16, fontWeight: 700, textDecoration: 'none', textAlign: 'center', boxShadow: `0 4px 16px ${P}40` }}>
          Crea tu flow gratis →
        </Link>
        <Link
          href="/sign-in"
          onClick={closeMenu}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            margin: '12px 16px 0',
            background: 'transparent',
            color: t.textSub,
            border: `1.5px solid ${signInBorderIdle}`,
            borderRadius: 100,
            padding: '14px 22px',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'border-color .2s,color .2s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = P
            el.style.color = t.text
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = signInBorderIdle
            el.style.color = t.textSub
          }}
        >
          <Icon name="user" size={18} color="currentColor" />
          Sign in
        </Link>
      </div>
    </nav>
  )
}

/* ── Hero ───────────────────────────────────────────────────── */
function Hero({ t }: { t: ThemeTokens }) {
  return (
    <section style={{ background: t.pageBg, minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', padding: '100px 24px 80px' }}>
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle,${t.heroGlow} 0%,transparent 65%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '10%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle,${t.heroGlow2} 0%,transparent 65%)`, pointerEvents: 'none' }} />
      {!t.dark && <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${P}06 1.5px,transparent 1.5px)`, backgroundSize: '28px 28px', pointerEvents: 'none' }} />}

      <div style={{ maxWidth: 1140, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 64, alignItems: 'center' }}>
        <div className="landing-anim-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: t.badgeBg, border: `1px solid ${t.badgeBorder}`, borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: t.badgeText, marginBottom: 28, backdropFilter: 'blur(8px)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: S, animation: 'landingPulse 2s infinite', display: 'inline-block' }} />
            LATAM-first · Lanzado 2025
          </div>
          <h1 style={{ fontSize: 'clamp(44px,5.5vw,72px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-2px', color: t.headingColor, marginBottom: 24 }}>
            Un formulario<br />
            <span className={t.gradClass}>disfrazado de<br />conversación.</span>
          </h1>
          <p style={{ fontSize: 18, color: t.textSub, lineHeight: 1.7, marginBottom: 36, maxWidth: 420, fontWeight: 400 }}>
            Reemplaza tus formularios con flows conversacionales. Más contexto, menos fricción, cero código.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 36 }}>
            {['⏱ Listo en 2 minutos', '💬 Una pregunta a la vez', '🎯 Leads calificados'].map(tx => (
              <div key={tx} style={{ background: t.pillBg, border: `1px solid ${t.pillBorder}`, borderRadius: 100, padding: '7px 16px', fontSize: 13, color: t.pillText, fontWeight: 500 }}>{tx}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/sign-up" style={{ background: P, color: '#fff', borderRadius: 100, padding: '15px 32px', fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-block', boxShadow: `0 6px 28px ${P}50`, transition: 'transform .15s,box-shadow .15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 12px 36px ${P}60` }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = `0 6px 28px ${P}50` }}
            >Crea tu flow gratis →</Link>
            <a href="#demo" style={{ background: 'transparent', color: t.textSub, border: `1.5px solid ${t.dark ? 'rgba(255,255,255,.15)' : t.border}`, borderRadius: 100, padding: '15px 28px', fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block', transition: 'border-color .2s,color .2s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = P; el.style.color = t.text }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = t.dark ? 'rgba(255,255,255,.15)' : t.border; el.style.color = t.textSub }}
            >Ver demo</a>
          </div>
          <div style={{ marginTop: 48, display: 'flex', gap: 32, borderTop: `1px solid ${t.dark ? 'rgba(255,255,255,.07)' : t.border}`, paddingTop: 32 }}>
            {[['3.2×', 'más conversión'], ['<2min', 'para publicar'], ['0 código', 'necesario']].map(([v, l]) => (
              <div key={v}>
                <div style={{ fontSize: 22, fontWeight: 700, color: P, letterSpacing: '-.5px' }}>{v}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="landing-anim-in2" style={{ display: 'flex', justifyContent: 'center' }}>
          <ChatMockAuto />
        </div>
      </div>
    </section>
  )
}

/* ── Problema ───────────────────────────────────────────────── */
function Problema({ t }: { t: ThemeTokens }) {
  return (
    <section className="landing-section-padding" style={{ background: t.altBg, padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${t.gridLine} 1px,transparent 1px),linear-gradient(90deg,${t.gridLine} 1px,transparent 1px)`, backgroundSize: '60px 60px', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1140, margin: '0 auto', position: 'relative' }}>
        <Fade>
          <div className="landing-mb-header" style={{ marginBottom: 80 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.dark ? S : P, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16 }}>El problema</div>
            <h2 style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.05, color: t.text, maxWidth: 700 }}>
              Los formularios<br /><span className={t.gradClass}>ya no funcionan.</span>
            </h2>
          </div>
        </Fade>

        {/* Stats */}
        <div className="landing-stats-row">
          {[
            { n: 67, suffix: '%', label: 'de usuarios abandona un formulario largo antes de terminarlo', note: 'Fuente: Baymard Institute' },
            { n: 47, suffix: '×', decimals: 1, label: 'menos contexto del lead capturado vs. una conversación guiada', note: 'Dato interno Dilo' },
            { n: 0, suffix: '', label: 'datos de intención en la mayoría de formularios de contacto estándar', note: 'Análisis de 500 forms LATAM' },
          ].map((st, i) => (
            <Fade key={i} delay={i * .1}>
              <div className={i === 0 ? 'landing-stat-first' : i === 2 ? 'landing-stat-last' : 'landing-stat-mid'} style={{ background: t.statBg, border: `1px solid ${t.border}`, borderRadius: i === 0 ? '20px 0 0 20px' : i === 2 ? '0 20px 20px 0' : '0', padding: '48px 40px', position: 'relative', overflow: 'hidden', boxShadow: t.dark ? 'none' : '0 2px 20px rgba(124,58,237,.06)' }}>
                <div style={{ position: 'absolute', top: -20, right: -10, fontSize: 120, fontWeight: 700, lineHeight: 1, color: 'rgba(124,58,237,.04)', pointerEvents: 'none', letterSpacing: '-6px' }}>{st.n}{st.suffix}</div>
                <div style={{ fontSize: 'clamp(52px,6vw,80px)', fontWeight: 700, letterSpacing: '-3px', lineHeight: 1, marginBottom: 16 }}>
                  <span className={t.gradClass}><StatCounter target={st.n} suffix={st.suffix} decimals={st.decimals || 0} /></span>
                </div>
                <div style={{ fontSize: 15, color: t.textSub, lineHeight: 1.6, maxWidth: 240, marginBottom: 16 }}>{st.label}</div>
                <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 500 }}>{st.note}</div>
              </div>
            </Fade>
          ))}
        </div>

        {/* Comparison */}
        <Fade delay={.3}>
          <div className="landing-compare-row">
            <div className="landing-compare-bad" style={{ background: t.formBad, border: `1px solid ${t.formBadBorder}`, borderRadius: '0 0 0 20px', padding: '36px 40px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.formBadText, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.formBadText }} /> Form tradicional
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Nombre completo', 'Apellido', 'Email corporativo', 'Teléfono', 'Empresa', 'Cargo', '# empleados', 'Presupuesto estimado', '¿Cómo nos conociste?', 'Comentarios adicionales'].map((f, i) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i > 5 ? .45 : 1 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${t.formBadNote}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: t.dark ? 'rgba(255,255,255,.45)' : '#6B7280' }}>{f}</span>
                    {i > 7 && <span style={{ fontSize: 11, color: t.formBadText, fontWeight: 600 }}>← abandono</span>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: '12px 16px', background: t.dark ? 'rgba(239,68,68,.1)' : '#FEE2E2', borderRadius: 10, fontSize: 13, color: t.formBadText, fontWeight: 600 }}>Tasa de completado: ~33%</div>
            </div>
            <div className="landing-compare-good" style={{ background: t.formGood, border: `1px solid ${t.formGoodBorder}`, borderRadius: '0 0 20px 0', padding: '36px 40px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.dark ? '#A78BFA' : P, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: P, animation: 'landingPulse 2s infinite' }} /> Dilo Flow
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['¿Cuál es tu nombre?', '¿Y tu empresa?', '¿Cuántos leads al mes?', '¿Tienes equipo técnico?'].map((q, i) => (
                  <div key={q} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: t.checkBg, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: P }}>{i + 1}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: t.textSub, marginBottom: 4 }}>{q}</div>
                      <div style={{ height: 6, background: t.dark ? `${P}25` : `${P}15`, borderRadius: 3, width: 80 + i * 20 }}>
                        <div style={{ height: '100%', background: `linear-gradient(90deg,${P},${S})`, borderRadius: 3, width: '85%' }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 13, color: t.textMuted, fontStyle: 'italic', marginTop: 4 }}>Una pregunta a la vez. Sin ansiedad.</div>
              </div>
              <div style={{ marginTop: 20, padding: '12px 16px', background: t.dark ? `rgba(124,58,237,.15)` : `${P}12`, borderRadius: 10, fontSize: 13, color: P, fontWeight: 600 }}>Tasa de completado: ~89%</div>
            </div>
          </div>
        </Fade>
      </div>
    </section>
  )
}

/* ── Cómo funciona ──────────────────────────────────────────── */
function ComoFunciona({ t }: { t: ThemeTokens }) {
  const steps = [
    { num: '01', icon: 'pencil' as IconKey, title: 'Diseña tu flow', desc: 'Editor visual sin código. Agrega preguntas, lógica condicional y personalización en minutos.' },
    { num: '02', icon: 'link'   as IconKey, title: 'Compártelo',     desc: 'Un link. Embébelo en tu web, envíalo por WhatsApp o conéctalo a tu CRM.' },
    { num: '03', icon: 'inbox'  as IconKey, title: 'Recibe leads calificados', desc: 'Cada respuesta llega estructurada, ordenada y lista para cerrar.' },
  ]
  return (
    <section id="como-funciona" className="landing-section-padding" style={{ background: t.pageBg, padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${P}30,transparent)` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${P}30,transparent)` }} />
      {t.dark && <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: `radial-gradient(ellipse,${P}10 0%,transparent 65%)`, pointerEvents: 'none' }} />}

      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <Fade>
          <div className="landing-mb-header" style={{ marginBottom: 80 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.dark ? S : P, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16 }}>Cómo funciona</div>
            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.05, color: t.text }}>
              De cero a lead<br /><span className={t.gradClass}>en tres pasos.</span>
            </h2>
          </div>
        </Fade>
        <div style={{ position: 'relative' }}>
          <div className="landing-steps-connector" style={{ background: `linear-gradient(90deg,${P},${S})`, opacity: .25 }} />
          <div className="landing-steps-row">
            {steps.map((st, i) => (
              <Fade key={i} delay={i * .15}>
                <div className="landing-card-h" style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 24, padding: '40px 36px', height: '100%', cursor: 'default', boxShadow: t.dark ? 'none' : `0 4px 24px rgba(124,58,237,.07)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: `${P}14`, border: `1px solid ${P}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={st.icon} size={24} color={P} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.dark ? 'rgba(255,255,255,.1)' : 'rgba(124,58,237,.12)', letterSpacing: '-.5px' }}>{st.num}</span>
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 12, letterSpacing: '-.5px' }}>{st.title}</h3>
                  <p style={{ fontSize: 15, color: t.textSub, lineHeight: 1.7 }}>{st.desc}</p>
                  <div style={{ marginTop: 32, height: 2, borderRadius: 2, background: `linear-gradient(90deg,${P},${S})`, opacity: .3 + i * .15 }} />
                </div>
              </Fade>
            ))}
          </div>
        </div>
        <Fade delay={.4}>
          <div id="integraciones" style={{ marginTop: 48, padding: '24px 32px', background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, boxShadow: t.dark ? 'none' : `0 2px 12px rgba(124,58,237,.05)` }}>
            <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500 }}>Se conecta con tus herramientas</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {['HubSpot', 'Notion', 'Airtable', 'Slack', 'Zapier', 'Make'].map(tx => (
                <div key={tx} style={{ padding: '5px 14px', borderRadius: 100, background: t.dark ? 'rgba(255,255,255,.05)' : `${P}08`, border: `1px solid ${t.border}`, fontSize: 12, fontWeight: 600, color: t.textSub }}>{tx}</div>
              ))}
            </div>
          </div>
        </Fade>
      </div>
    </section>
  )
}

/* ── Beneficios ─────────────────────────────────────────────── */
function Beneficios({ t }: { t: ThemeTokens }) {
  const items = [
    { icon: 'bolt'   as IconKey, title: 'Velocidad real',       desc: 'Un flow publicado en menos de 2 minutos. Sin developers ni tickets de IT.',   accent: P },
    { icon: 'funnel' as IconKey, title: 'Leads con contexto',   desc: 'Cada respuesta es una señal de intención. Sabes qué quiere antes de llamar.', accent: S },
    { icon: 'chart'  as IconKey, title: 'Datos estructurados',  desc: 'Sin hojas caóticas. Cada lead llega ordenado y listo para tu CRM.',            accent: P },
    { icon: 'phone'  as IconKey, title: 'Mobile-first',          desc: 'Diseñado para el pulgar. Funciona perfecto en cualquier dispositivo.',          accent: S },
    { icon: 'arrow'  as IconKey, title: 'Sin fricción',          desc: 'Una pregunta a la vez. Tu usuario se siente escuchado, no interrogado.',       accent: P },
    { icon: 'db'     as IconKey, title: 'Integraciones nativas', desc: 'Notion, HubSpot, Airtable, Slack, Zapier — tu stack, sin fricciones.',         accent: S },
  ]
  return (
    <section style={{ background: t.altBg, padding: '120px 24px', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${t.dot} 1px,transparent 1px)`, backgroundSize: '32px 32px', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1140, margin: '0 auto', position: 'relative' }}>
        <Fade>
          <div style={{ marginBottom: 72 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: P, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16 }}>Por qué Dilo</div>
            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.05, color: t.text }}>
              Hecho para convertir,<br /><span className={t.gradClass}>no solo para verse bien.</span>
            </h2>
          </div>
        </Fade>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          {items.map((item, i) => (
            <Fade key={i} delay={i * .08}>
              <div className="landing-card-h" style={{ background: t.cardBg2, border: `1px solid ${t.border}`, borderRadius: 20, padding: '32px 28px', height: '100%', cursor: 'default', position: 'relative', overflow: 'hidden', boxShadow: t.dark ? 'none' : '0 2px 16px rgba(124,58,237,.05)' }}>
                {(i === 0 || i === 5) && <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: `${item.accent}${t.dark ? '10' : '08'}`, pointerEvents: 'none' }} />}
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${item.accent}14`, border: `1px solid ${item.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Icon name={item.icon} size={22} color={item.accent} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: t.text, marginBottom: 10, letterSpacing: '-.3px' }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: t.textSub, lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Demo interactivo ───────────────────────────────────────── */
const DEMO_BIZ_OPTIONS = [
  { label: 'Agencia / Freelancer',    emoji: '🎨', value: 'agencia'      },
  { label: 'SaaS / Tech',             emoji: '💻', value: 'saas'         },
  { label: 'Inmobiliaria',            emoji: '🏠', value: 'inmobiliaria' },
  { label: 'Salud / Bienestar',       emoji: '🏥', value: 'salud'        },
  { label: 'Educación',               emoji: '🎓', value: 'educacion'    },
  { label: 'Comunidad / Organización',emoji: '🤝', value: 'comunidad'    },
  { label: 'Otro',                    emoji: '✨', value: 'otro'         },
]
const DEMO_USECASE_OPTIONS = [
  { label: 'Calificar y capturar leads',      emoji: '🎯', value: 'calificar_leads' },
  { label: 'Pre-cotizaciones automáticas',    emoji: '💰', value: 'cotizaciones'    },
  { label: 'Discovery de proyectos',          emoji: '🔍', value: 'discovery'       },
  { label: 'Onboarding de clientes',          emoji: '🚀', value: 'onboarding_cli'  },
  { label: 'Encuestas / recolección de datos',emoji: '📊', value: 'encuestas'       },
  { label: 'Algo diferente',                  emoji: '🌟', value: 'otro'            },
]
const DEMO_TEAM_OPTIONS = [
  { label: 'Solo yo',        emoji: '🙋', value: 'solo'   },
  { label: '2 – 5 personas', emoji: '👥', value: 'small'  },
  { label: '6 – 20 personas',emoji: '🏢', value: 'medium' },
  { label: 'Más de 20',      emoji: '🏗️', value: 'large'  },
]

type DemoCtx = { name: string; businessType: string; useCase: string; teamSize: string; email: string; phone: string }
type FlowStep =
  | { from: 'bot';  text: string | ((c: DemoCtx) => string) }
  | { from: 'user'; kind: 'text';   field: keyof DemoCtx; ph: string; inputType?: string }
  | { from: 'user'; kind: 'select'; field: keyof DemoCtx; options: { label: string; emoji: string; value: string }[] }

const DEMO_FLOW: FlowStep[] = [
  { from: 'bot',  text: '¡Hola! 👋 Soy el asistente de Dilo.\n\nUna pregunta a la vez — sin formularios.\n\n¿Cuál es tu nombre?' },
  { from: 'user', kind: 'text',   field: 'name',         ph: 'Tu nombre...' },
  { from: 'bot',  text: (c) => `¡Mucho gusto, ${c.name}! ✨\n\n¿Qué describe mejor tu negocio?` },
  { from: 'user', kind: 'select', field: 'businessType', options: DEMO_BIZ_OPTIONS },
  { from: 'bot',  text: '¿Para qué quieres usar Dilo principalmente?' },
  { from: 'user', kind: 'select', field: 'useCase',      options: DEMO_USECASE_OPTIONS },
  { from: 'bot',  text: '¿Cuántos hay en tu equipo?' },
  { from: 'user', kind: 'select', field: 'teamSize',     options: DEMO_TEAM_OPTIONS },
  { from: 'bot',  text: (c) => `¡Genial, ${c.name}! 🙌\n\nCon ese perfil Dilo te va a quedar perfecto.\n\nLos siguientes datos los usaremos para crear tu cuenta gratuita — sin formularios extra ni pasos repetidos.` },
  { from: 'user', kind: 'text',   field: 'email',        ph: 'tu@email.com',          inputType: 'email' },
  { from: 'bot',  text: '¿Y tu WhatsApp? Te contactamos ahí para ayudarte a publicar tu primer flow 💬' },
  { from: 'user', kind: 'text',   field: 'phone',        ph: '+57 300 000 0000',       inputType: 'tel' },
  { from: 'bot',  text: (c) => `¡Listo, ${c.name}! 🎉 Todo guardado.\n¿Creamos tu cuenta gratis ahora?` },
]

function DemoSection({ t }: { t: ThemeTokens }) {
  const [msgs,    setMsgs]    = useState<{ from: 'bot' | 'user'; text: string }[]>([])
  const [step,    setStep]    = useState(0)
  const [typing,  setTyping]  = useState(false)
  const [val,     setVal]     = useState('')
  const [ctx,     setCtx]     = useState<DemoCtx>({ name: '', businessType: '', useCase: '', teamSize: '', email: '', phone: '' })
  const [started, setStarted] = useState(false)
  const [done,    setDone]    = useState(false)
  const [skipped, setSkipped] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const botTotal = DEMO_FLOW.filter(s => s.from === 'bot').length
  const botShown = msgs.filter(m => m.from === 'bot').length
  const pct = botTotal ? Math.round((botShown / botTotal) * 100) : 0

  const showBot = useCallback((idx: number, newCtx: DemoCtx) => {
    const s = DEMO_FLOW[idx]
    if (!s || s.from !== 'bot') return
    setTyping(true)
    setTimeout(() => {
      const text = typeof s.text === 'function' ? s.text(newCtx) : s.text
      setTyping(false)
      setMsgs(p => [...p, { from: 'bot', text }])
      const next = idx + 1
      setStep(next)
      if (next >= DEMO_FLOW.length) setDone(true)
    }, 900)
  }, [])

  function start() { setStarted(true); showBot(0, ctx) }

  // displayText → shown in chat bubble; ctxValue → stored in ctx (defaults to displayText)
  function submit(displayText: string, ctxValue?: string) {
    if (!displayText.trim() || typing || done) return
    const display = displayText.trim()
    const store   = (ctxValue ?? display).trim()
    const s = DEMO_FLOW[step]
    if (!s || s.from !== 'user') return
    const newCtx = { ...ctx, [s.field]: store }
    setCtx(newCtx)
    setMsgs(p => [...p, { from: 'user', text: display }])
    setVal('')
    const next = step + 1
    if (next < DEMO_FLOW.length && DEMO_FLOW[next].from === 'bot') {
      setTimeout(() => showBot(next, newCtx), 400)
    } else {
      setStep(next)
    }
  }

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [msgs, typing, done])

  return (
    <section id="demo" style={{ background: t.pageBg, padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${S}30,transparent)` }} />
      {t.dark && <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle,${P}12 0%,transparent 60%)`, pointerEvents: 'none' }} />}

      <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 80, alignItems: 'center', position: 'relative' }}>
        <Fade>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.dark ? S : P, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16 }}>Demo en vivo</div>
            <h2 style={{ fontSize: 'clamp(36px,4.5vw,56px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.08, color: t.text, marginBottom: 24 }}>
              Pruébalo<br /><span className={t.gradClass}>tú mismo.</span>
            </h2>
            <p style={{ fontSize: 17, color: t.textSub, lineHeight: 1.75, marginBottom: 40, maxWidth: 400 }}>
              Así vive tu prospecto la experiencia. Responde las preguntas y siente la diferencia.
            </p>
            {['Una pregunta a la vez — sin ansiedad', 'El usuario siente que lo escuchas', 'Leads con contexto real, listos para cerrar'].map((tx, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${P}14`, border: `1px solid ${P}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="check" size={14} color={P} />
                </div>
                <span style={{ fontSize: 15, color: t.textSub, fontWeight: 500 }}>{tx}</span>
              </div>
            ))}
          </div>
        </Fade>

        <Fade delay={.15}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 28, overflow: 'hidden', width: 400, maxWidth: '100%', boxShadow: t.dark ? `0 32px 100px rgba(0,0,0,.5),0 0 0 1px rgba(124,58,237,.15)` : `0 16px 60px rgba(124,58,237,.15),0 0 0 1px rgba(124,58,237,.1)`, fontFamily: 'inherit' }}>
              <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #F0EBFF' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>D</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Flow Demo · Dilo</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'landingPulse 2s infinite' }} /> En línea ahora
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: P }}>{pct}%</div>
              </div>
              <div style={{ height: 4, background: '#F0EBFF' }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg,${P},${S})`, width: `${pct}%`, transition: 'width .5s ease' }} />
              </div>
              <div style={{ padding: '8px 20px', fontSize: 12, color: '#9CA3AF', fontWeight: 500, textAlign: 'center' }}>{botShown} de {botTotal} · seguimos cuando quieras</div>
              <div ref={scrollRef} style={{ padding: '8px 16px 16px', minHeight: 300, maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!started && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg,${P},${S})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="chat" size={26} color="#fff" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 6 }}>Demo interactivo</div>
                      <div style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.55 }}>Responde y mira cómo se siente<br />para tu usuario.</div>
                    </div>
                    <button onClick={start} style={{ background: P, color: '#fff', border: 'none', borderRadius: 100, padding: '13px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 20px ${P}45`, fontFamily: 'inherit' }}>Comenzar →</button>
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end', animation: 'landingSlideUp .2s ease' }}>
                    {m.from === 'bot' && <div style={{ width: 30, height: 30, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>D</div>}
                    <div style={{ maxWidth: '76%', padding: '11px 15px', whiteSpace: 'pre-line', borderRadius: m.from === 'bot' ? '4px 18px 18px 18px' : '18px 4px 18px 18px', background: m.from === 'bot' ? '#fff' : P, color: m.from === 'bot' ? '#111827' : '#fff', fontSize: 14, lineHeight: 1.55, boxShadow: m.from === 'bot' ? '0 1px 8px rgba(0,0,0,.07)' : `0 2px 10px ${P}40`, border: m.from === 'bot' ? '1px solid #F0EBFF' : 'none' }}>{m.text}</div>
                  </div>
                ))}
                {typing && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>D</div>
                    <div style={{ padding: '11px 15px', borderRadius: '4px 18px 18px 18px', background: '#fff', border: '1px solid #F0EBFF', display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(j => <span key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4B5FD', display: 'block', animation: `landingBounce 1.2s ${j * .2}s infinite` }} />)}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Input area ── */}
              {(() => {
                const curStep = step < DEMO_FLOW.length ? DEMO_FLOW[step] : null
                const isSelect = started && !done && !typing && curStep?.from === 'user' && curStep.kind === 'select'
                const isText   = started && !done && !typing && curStep?.from === 'user' && curStep.kind === 'text'

                if (done && !skipped) return (
                  <div style={{ padding: '14px 16px', borderTop: '1px solid #F0EBFF', background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Link href="/sign-up"
                      onClick={() => {
                        try { localStorage.setItem('dilo-onboarding-prefill', JSON.stringify({ name: ctx.name, businessType: ctx.businessType, useCase: ctx.useCase, teamSize: ctx.teamSize, phone: ctx.phone })) } catch { /* ignore */ }
                      }}
                      style={{ display: 'block', textAlign: 'center', background: P, color: '#fff', borderRadius: 14, padding: '14px 20px', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: `0 4px 20px ${P}45`, transition: 'opacity .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '.85' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                    >Crear cuenta gratis →</Link>
                    <button onClick={() => setSkipped(true)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit', transition: 'color .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9CA3AF' }}
                    >Solo quiero explorar por ahora</button>
                  </div>
                )
                if (done && skipped) return (
                  <div style={{ padding: '14px 16px', borderTop: '1px solid #F0EBFF', background: '#F0FDF4', textAlign: 'center', color: '#16A34A', fontWeight: 600, fontSize: 14 }}>🙌 ¡Cuando quieras, aquí estaremos!</div>
                )
                if (isSelect) {
                  const opts = (curStep as Extract<FlowStep, { kind: 'select' }>).options
                  return (
                    <div style={{ padding: '12px 14px', borderTop: '1px solid #F0EBFF', background: '#FAFAFA', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {opts.map(opt => (
                        <button key={opt.label} onClick={() => submit(opt.label, opt.value)} style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 100, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all .15s', fontFamily: 'inherit' }}
                          onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = P; el.style.background = `${P}0D`; el.style.color = P }}
                          onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = '#E5E7EB'; el.style.background = '#fff'; el.style.color = '#374151' }}
                        ><span>{opt.emoji}</span>{opt.label}</button>
                      ))}
                    </div>
                  )
                }
                const textStep = isText ? (curStep as Extract<FlowStep, { kind: 'text' }>) : null
                const isPhoneDemo = Boolean(textStep?.field === 'phone')
                if (isPhoneDemo && textStep) {
                  return (
                    <div style={{ padding: '12px 14px', borderTop: '1px solid #F0EBFF', background: '#FAFAFA', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <DiloPhoneField
                          variant="landing"
                          value={val}
                          onChange={setVal}
                          placeholder={textStep.ph}
                          disabled={!isText}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!val.trim() || !isValidPhoneNumber(val)) return
                          const display = formatPhoneNumberIntl(val) || val
                          submit(display, val)
                        }}
                        disabled={!val.trim() || !isText || !isValidPhoneNumber(val)}
                        style={{ background: val.trim() && isText && isValidPhoneNumber(val) ? P : '#E5E7EB', color: val.trim() && isText && isValidPhoneNumber(val) ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 100, padding: '11px 18px', fontSize: 14, fontWeight: 600, cursor: val.trim() && isText && isValidPhoneNumber(val) ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'background .2s', whiteSpace: 'nowrap' }}
                      >Enviar →</button>
                    </div>
                  )
                }
                return (
                  <div style={{ padding: '12px 14px', borderTop: '1px solid #F0EBFF', background: '#FAFAFA', display: 'flex', gap: 8 }}>
                    <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit(val)} disabled={!isText}
                      type={(isText ? (curStep as Extract<FlowStep, { kind: 'text' }>).inputType : undefined) ?? 'text'}
                      placeholder={isText ? ((curStep as Extract<FlowStep, { kind: 'text' }>).ph) : started ? '...' : 'Iniciando...'}
                      style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 100, padding: '11px 18px', fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', transition: 'border-color .2s' }}
                      onFocus={e => { e.target.style.borderColor = P }} onBlur={e => { e.target.style.borderColor = '#E5E7EB' }}
                    />
                    <button onClick={() => submit(val)} disabled={!val.trim() || !isText}
                      style={{ background: val.trim() && isText ? P : '#E5E7EB', color: val.trim() && isText ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 100, padding: '11px 18px', fontSize: 14, fontWeight: 600, cursor: val.trim() && isText ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'background .2s', whiteSpace: 'nowrap' }}
                    >Enviar →</button>
                  </div>
                )
              })()}
            </div>
          </div>
        </Fade>
      </div>
    </section>
  )
}

/* ── Pricing ────────────────────────────────────────────────── */
function Pricing({ t }: { t: ThemeTokens }) {
  const [yearly, setYearly] = useState(false)
  const plans = [
    { name: 'Gratis',  price: '$0',              desc: 'Para empezar hoy',             features: ['3 flows activos', '150 respuestas/mes', 'Link compartible', 'Exportar CSV'],                                                         cta: 'Empezar gratis',   h: false },
    { name: 'Pro',     price: yearly ? '$19' : '$25', desc: 'Para equipos en crecimiento', features: ['Flows ilimitados', '5,000 respuestas/mes', 'HubSpot & Notion', 'Dominio propio', 'Analytics avanzados', 'Soporte prioritario'], cta: 'Comenzar ahora',   h: true  },
    { name: 'Agencia', price: yearly ? '$69' : '$89', desc: 'Para múltiples clientes',     features: ['Todo en Pro', 'Clientes ilimitados', 'White-label completo', 'API access', 'Onboarding dedicado'],                              cta: 'Hablar con ventas', h: false },
  ]
  return (
    <section id="pricing" style={{ background: t.altBg, padding: '120px 24px', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${t.gridLine} 1px,transparent 1px),linear-gradient(90deg,${t.gridLine} 1px,transparent 1px)`, backgroundSize: '60px 60px', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1140, margin: '0 auto', position: 'relative' }}>
        <Fade>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: P, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16 }}>Precios</div>
            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.05, color: t.text, marginBottom: 32 }}>Simple y transparente.</h2>
            <div style={{ display: 'inline-flex', background: t.pricingSwitch, borderRadius: 100, padding: 4, border: `1px solid ${t.pricingSwitchBorder}`, gap: 4 }}>
              {['Mensual', 'Anual (−20%)'].map((l, i) => (
                <button key={l} onClick={() => setYearly(i === 1)} style={{ padding: '8px 22px', borderRadius: 100, border: 'none', background: (i === 1) === yearly ? P : 'transparent', color: (i === 1) === yearly ? '#fff' : t.pricingInactiveColor, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit' }}>{l}</button>
              ))}
            </div>
          </div>
        </Fade>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          {plans.map((pl, i) => (
            <Fade key={i} delay={i * .1}>
              <div style={{ background: pl.h ? P : t.cardBg, borderRadius: 24, padding: '40px 32px', border: pl.h ? 'none' : `1px solid ${t.border}`, boxShadow: pl.h ? `0 24px 80px ${P}30` : t.dark ? 'none' : `0 4px 24px rgba(124,58,237,.07)`, position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {pl.h && <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />}
                {pl.h && <div style={{ position: 'absolute', top: 20, right: 20, background: S, color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '4px 12px' }}>MÁS POPULAR</div>}
                <div style={{ fontSize: 13, fontWeight: 600, color: pl.h ? 'rgba(255,255,255,.6)' : t.textMuted, marginBottom: 12 }}>{pl.name}</div>
                <div style={{ fontSize: 56, fontWeight: 700, color: pl.h ? '#fff' : t.text, letterSpacing: '-3px', lineHeight: 1, marginBottom: 8 }}>
                  {pl.price}<span style={{ fontSize: 16, fontWeight: 500, opacity: .5 }}>/mes</span>
                </div>
                <div style={{ fontSize: 14, color: pl.h ? 'rgba(255,255,255,.55)' : t.textMuted, marginBottom: 32 }}>{pl.desc}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36, flex: 1 }}>
                  {pl.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: pl.h ? 'rgba(255,255,255,.15)' : t.checkBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Icon name="check" size={10} color={pl.h ? '#fff' : P} sw={2.5} />
                      </div>
                      <span style={{ fontSize: 14, color: pl.h ? 'rgba(255,255,255,.8)' : t.textSub, lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/sign-up" style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 100, border: pl.h ? '2px solid rgba(255,255,255,.25)' : `1px solid ${P}35`, background: pl.h ? 'rgba(255,255,255,.12)' : 'transparent', color: pl.h ? '#fff' : P, fontSize: 15, fontWeight: 700, textAlign: 'center', textDecoration: 'none', transition: 'all .2s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (pl.h) el.style.background = 'rgba(255,255,255,.22)'; else { el.style.background = P; el.style.color = '#fff' } }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (pl.h) el.style.background = 'rgba(255,255,255,.12)'; else { el.style.background = 'transparent'; el.style.color = P } }}
                >{pl.cta}</Link>
              </div>
            </Fade>
          ))}
        </div>
        <Fade delay={.4}>
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: t.textMuted }}>Sin tarjeta de crédito para empezar · Cancela cuando quieras · Soporte en español</div>
        </Fade>
      </div>
    </section>
  )
}

/* ── CTA Final ──────────────────────────────────────────────── */
function CTAFinal({ t }: { t: ThemeTokens }) {
  return (
    <section style={{ background: t.pageBg, padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>
      {t.dark
        ? <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 100%,${P}18 0%,transparent 60%)`, pointerEvents: 'none' }} />
        : <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${P}07 1.5px,transparent 1.5px)`, backgroundSize: '28px 28px', pointerEvents: 'none' }} />
      }
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${P}30,transparent)` }} />
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <Fade>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: 24, background: `linear-gradient(135deg,${P},${S})`, marginBottom: 32, boxShadow: `0 12px 40px ${P}40` }}>
            <Icon name="bolt" size={32} color="#fff" sw={1} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.dark ? S : P, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 20 }}>Empieza hoy</div>
          <h2 style={{ fontSize: 'clamp(40px,6vw,72px)', fontWeight: 700, letterSpacing: '-2.5px', color: t.text, lineHeight: 1.02, marginBottom: 24 }}>
            Tu primer flow<br /><span className={t.gradClass}>en menos de 2 minutos.</span>
          </h2>
          <p style={{ fontSize: 18, color: t.textSub, lineHeight: 1.7, marginBottom: 48, maxWidth: 500, margin: '0 auto 48px' }}>
            Sin tarjeta de crédito. Sin setup técnico. Sin excusas.
          </p>
          <Link href="/sign-up" style={{ display: 'inline-block', background: P, color: '#fff', borderRadius: 100, padding: '18px 48px', fontSize: 18, fontWeight: 700, textDecoration: 'none', boxShadow: `0 12px 48px ${P}50`, transition: 'transform .15s,box-shadow .15s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 20px 60px ${P}60` }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = `0 12px 48px ${P}50` }}
          >Crea tu flow gratis →</Link>
          <div style={{ marginTop: 20, fontSize: 13, color: t.textMuted }}>Gratis hasta 150 respuestas/mes</div>
          <div style={{ marginTop: 56, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {'🇲🇽 🇨🇴 🇦🇷 🇧🇷 🇨🇱 🇵🇪'.split(' ').map((f, i) => <span key={i} style={{ fontSize: 24 }}>{f}</span>)}
          </div>
        </Fade>
      </div>
    </section>
  )
}

type FooterLink = { label: string; href: string; external?: boolean }

const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Cómo funciona', href: '/#como-funciona' },
      { label: 'Precios', href: '/#pricing' },
      { label: 'Demo', href: '/#demo' },
      { label: 'Integraciones', href: '/#integraciones' },
      { label: 'Changelog', href: '/blog' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre nosotros', href: '/#como-funciona' },
      { label: 'Blog', href: '/blog' },
      {
        label: 'Contacto',
        href: 'mailto:legal@modecaitech.com?subject=Consulta%20desde%20getdilo.io',
        external: true,
      },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos', href: '/terms' },
      { label: 'Privacidad', href: '/privacy' },
    ],
  },
]

/* ── Footer ─────────────────────────────────────────────────── */
function Footer({ t }: { t: ThemeTokens }) {
  const linkStyle = { fontSize: 14, color: 'rgba(255,255,255,.4)', textDecoration: 'none', transition: 'color .2s' } as const
  const onLinkEnter = (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.color = '#fff' }
  const onLinkLeave = (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.4)' }

  return (
    <footer style={{ background: t.footerBg, padding: '56px 24px 32px', borderTop: `1px solid ${t.footerBorder}` }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 40, marginBottom: 48 }}>
          <div style={{ maxWidth: 220 }}>
            <div style={{ marginBottom: 16 }}>
              <DiloBrandLockup
                imageHeight={35}
                gapClassName="gap-[10px]"
                wordmarkClassName="font-bold"
                wordmarkStyle={{ fontSize: 27.5, color: '#fff', letterSpacing: '-.5px' }}
              />
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', lineHeight: 1.7 }}>Flows conversacionales que convierten más, con menos fricción.</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.2)', letterSpacing: '.1em', marginBottom: 16, textTransform: 'uppercase' }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.links.map((l) =>
                  l.external ? (
                    <a key={l.label} href={l.href} style={linkStyle} onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}>
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.label} href={l.href} style={linkStyle} onMouseEnter={onLinkEnter} onMouseLeave={onLinkLeave}>
                      {l.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.2)' }}>© 2025 Dilo. Hecho con ❤️ en LATAM.</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.2)' }}>Space Grotesk · LATAM-first</div>
        </div>
      </div>
    </footer>
  )
}

/* ── Main export ────────────────────────────────────────────── */
export default function LandingPage() {
  const [isDark, setIsDark] = useState(true) // SSR-safe default
  useEffect(() => {
    const saved = localStorage.getItem('dilo-theme')
    if (saved !== null) setIsDark(saved === 'dark')
  }, [])

  const t = getT(isDark, P, S)

  function toggleTheme() {
    setIsDark(d => {
      const next = !d
      localStorage.setItem('dilo-theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <div style={{ fontFamily: 'var(--font-dilo-sans), Space Grotesk, sans-serif', background: t.pageBg, color: t.text, transition: 'background .35s ease, color .35s ease' }}>
      <Nav t={t} isDark={isDark} toggleTheme={toggleTheme} />
      <Hero t={t} />
      <Problema t={t} />
      <ComoFunciona t={t} />
      <Beneficios t={t} />
      <DemoSection t={t} />
      <Pricing t={t} />
      <CTAFinal t={t} />
      <Footer t={t} />
    </div>
  )
}
