'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { DiloBrandLockup } from '@/components/dilo-brand-lockup'
import {
  getLandingTheme,
  LANDING_PRIMARY,
  LANDING_SECONDARY,
  persistPortalMarketingDark,
  readPortalMarketingDark,
  type LandingThemeTokens,
} from '@/lib/landing-theme'
import { PortalLandingIcon } from '@/components/portal/portal-landing-icon'
import { PortalThemeContext } from '@/components/portal/portal-theme-context'

const P = LANDING_PRIMARY
const S = LANDING_SECONDARY

function useFade(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => el.classList.add('in'), delay * 1000)
          obs.disconnect()
        }
      },
      { threshold: 0.08 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])
  return ref
}

function Fade({
  children,
  delay = 0,
  style = {},
}: {
  children: ReactNode
  delay?: number
  style?: React.CSSProperties
}) {
  const ref = useFade(delay)
  return (
    <div ref={ref} className="landing-scroll-fade" style={style}>
      {children}
    </div>
  )
}

function PortalNav({
  t,
  isDark,
  toggleTheme,
}: {
  t: LandingThemeTokens
  isDark: boolean
  toggleTheme: () => void
}) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  const navBg = scrolled ? t.navBg : 'transparent'
  const navBdr = scrolled ? `1px solid ${t.navBorder}` : 'none'
  const blur = scrolled ? 'blur(20px)' : 'none'

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: navBg,
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        borderBottom: navBdr,
        transition: 'all .3s ease',
      }}
    >
      <div
        style={{
          maxWidth: 1140,
          margin: '0 auto',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        <DiloBrandLockup imageHeight={40} logoForDarkBackground={isDark} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="https://getdilo.io"
            style={{
              color: t.navLink,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: 8,
              transition: 'color .2s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = t.text
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = t.navLink
            }}
          >
            Conoce Dilo
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: t.toggleBg,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PortalLandingIcon
              name={isDark ? 'sun' : 'moon'}
              size={18}
              color={t.toggleIcon}
            />
          </button>
        </div>
      </div>
    </nav>
  )
}

const BENEFITS = [
  {
    icon: 'inbox' as const,
    title: 'Casos en un solo lugar',
    desc: 'Ve el estado de cada solicitud de soporte sin perseguir hilos de correo ni chats dispersos.',
  },
  {
    icon: 'chart' as const,
    title: 'Prioridad y seguimiento',
    desc: 'Entiende qué está urgente, qué está en curso y qué ya se resolvió — con contexto claro.',
  },
  {
    icon: 'chat' as const,
    title: 'Comunicación alineada',
    desc: 'Notas y actualizaciones visibles para tu equipo y tu proveedor, siempre sincronizados.',
  },
  {
    icon: 'bolt' as const,
    title: 'Entrada sin contraseña',
    desc: 'Un código de 6 dígitos por correo. Sin recordar claves ni instalar otra app.',
  },
]

const STEPS = [
  { n: '01', title: 'Recibes acceso', desc: 'Tu proveedor te invita con el correo de tu empresa.' },
  { n: '02', title: 'Código por email', desc: 'Ingresas el correo y recibes un código de un solo uso.' },
  { n: '03', title: 'Portal activo', desc: 'Consulta casos, prioridades y notas cuando lo necesites.' },
]

const STATS = [
  { value: '24/7', label: 'Acceso al portal' },
  { value: '0', label: 'Contraseñas' },
  { value: '1', label: 'Vista unificada' },
]

export function PortalMarketingShell({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setIsDark(readPortalMarketingDark())
    setMounted(true)
  }, [])

  const t = getLandingTheme(isDark, P, S)

  function toggleTheme() {
    setIsDark((d) => {
      const next = !d
      persistPortalMarketingDark(next)
      return next
    })
  }

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0D0720',
        }}
      />
    )
  }

  return (
    <PortalThemeContext.Provider value={{ isDark }}>
    <div
      style={{
        minHeight: '100vh',
        background: t.pageBg,
        color: t.text,
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        transition: 'background .3s ease, color .3s ease',
      }}
    >
      <PortalNav t={t} isDark={isDark} toggleTheme={toggleTheme} />

      {/* Hero + auth */}
      <section
        style={{
          position: 'relative',
          padding: '120px 20px 80px',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(900px, 120vw)',
            height: 500,
            background: `radial-gradient(ellipse, ${t.heroGlow} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 0,
            right: '-5%',
            width: 400,
            height: 400,
            background: `radial-gradient(circle, ${t.heroGlow2} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <div className="portal-hero-grid" style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div className="landing-anim-in">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: t.badgeBg,
                border: `1px solid ${t.badgeBorder}`,
                borderRadius: 100,
                padding: '6px 14px',
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: S,
                  animation: 'landingPulse 2s ease infinite',
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.badgeText }}>
                Portal de soporte · Powered by Dilo
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: t.headingColor,
                margin: '0 0 20px',
              }}
            >
              Tu soporte,{' '}
              <span className={t.gradClass}>en un solo lugar</span>
            </h1>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.65,
                color: t.textSub,
                maxWidth: 520,
                margin: '0 0 36px',
              }}
            >
              Claridad para tu equipo y tu proveedor. Casos, prioridades y notas
              visibles — sin correos perdidos ni contraseñas que recordar.
            </p>

            <div
              className="landing-stats-row"
              style={{
                maxWidth: 480,
                borderRadius: 16,
                overflow: 'hidden',
                border: `1px solid ${t.border}`,
              }}
            >
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    background: t.cardBg,
                    padding: '20px 16px',
                    textAlign: 'center',
                    borderRight: i < STATS.length - 1 ? `1px solid ${t.border}` : 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: t.headingColor,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-anim-in2" style={{ position: 'relative', zIndex: 2 }}>
            {children}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ padding: '0 20px 80px', background: t.altBg }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <Fade>
            <h2
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 800,
                textAlign: 'center',
                marginBottom: 12,
                color: t.headingColor,
              }}
            >
              Todo lo que necesitas para{' '}
              <span className={t.gradClass}>dar seguimiento</span>
            </h2>
            <p
              style={{
                textAlign: 'center',
                color: t.textSub,
                fontSize: 16,
                maxWidth: 520,
                margin: '0 auto 48px',
              }}
            >
              Diseñado para gerentes y coordinadores que necesitan visibilidad,
              no otra herramienta más que aprender.
            </p>
          </Fade>

          <div className="portal-benefits-grid">
            {BENEFITS.map((b, i) => (
              <Fade key={b.title} delay={i * 0.08}>
                <div
                  className="landing-card-h"
                  style={{
                    background: t.cardBg,
                    border: `1px solid ${t.border}`,
                    borderRadius: 20,
                    padding: 28,
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: t.pillBg,
                      border: `1px solid ${t.pillBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 18,
                    }}
                  >
                    <PortalLandingIcon name={b.icon} size={22} color={t.pillText} />
                  </div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      margin: '0 0 8px',
                      color: t.headingColor,
                    }}
                  >
                    {b.title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: t.textSub, margin: 0 }}>
                    {b.desc}
                  </p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" style={{ padding: '80px 20px', background: t.pageBg }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <Fade>
            <h2
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 800,
                textAlign: 'center',
                marginBottom: 48,
                color: t.headingColor,
              }}
            >
              Cómo entrar al portal
            </h2>
          </Fade>
          <div className="portal-steps-grid">
            {STEPS.map((step, i) => (
              <Fade key={step.n} delay={i * 0.1}>
                <div style={{ textAlign: 'center', padding: '0 12px' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: t.textLabel,
                      letterSpacing: '0.08em',
                      marginBottom: 12,
                    }}
                  >
                    {step.n}
                  </div>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      margin: '0 0 10px',
                      color: t.headingColor,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 14, color: t.textSub, lineHeight: 1.6, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 20px 80px' }}>
        <Fade>
          <div
            style={{
              maxWidth: 1140,
              margin: '0 auto',
              background: t.cardBg2,
              border: `1px solid ${t.border}`,
              borderRadius: 24,
              padding: '48px 32px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at 50% 0%, ${t.heroGlow} 0%, transparent 60%)`,
                pointerEvents: 'none',
              }}
            />
            <h2
              style={{
                fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                fontWeight: 800,
                margin: '0 0 12px',
                color: t.headingColor,
                position: 'relative',
              }}
            >
              ¿Tu empresa opera flows con Dilo?
            </h2>
            <p
              style={{
                fontSize: 15,
                color: t.textSub,
                maxWidth: 480,
                margin: '0 auto 28px',
                position: 'relative',
              }}
            >
              El portal de cliente es independiente del workspace de partner.
              Si quieres automatizar soporte, crea tu cuenta en getdilo.io.
            </p>
            <Link
              href="https://getdilo.io/sign-up"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: P,
                color: '#fff',
                borderRadius: 100,
                padding: '12px 28px',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: `0 4px 20px ${P}40`,
                transition: 'opacity .15s, transform .15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.opacity = '0.9'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.opacity = '1'
                ;(e.currentTarget as HTMLElement).style.transform = 'none'
              }}
            >
              Crea tu flow gratis
              <PortalLandingIcon name="arrow" size={18} color="#fff" />
            </Link>
          </div>
        </Fade>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: t.footerBg,
          borderTop: `1px solid ${t.footerBorder}`,
          padding: '32px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1140,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <DiloBrandLockup imageHeight={32} logoForDarkBackground />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', margin: 0 }}>
            © {new Date().getFullYear()} Dilo · Portal de soporte para clientes
          </p>
        </div>
      </footer>
    </div>
    </PortalThemeContext.Provider>
  )
}
