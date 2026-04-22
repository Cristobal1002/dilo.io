'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

/* ── Design tokens ── */
const P = '#7C3AED'
const S = '#06B6D4'

/* ── Types ── */
type Step =
  | { id: 'name';         question: string; type: 'text';   placeholder: string }
  | { id: 'phone';        question: string; type: 'tel';    placeholder: string }
  | { id: 'businessType'; question: string; type: 'select'; options: { value: string; label: string; emoji: string }[] }
  | { id: 'useCase';      question: string; type: 'select'; options: { value: string; label: string; emoji: string }[] }
  | { id: 'teamSize';     question: string; type: 'select'; options: { value: string; label: string; emoji: string }[] }

const STEPS: Step[] = [
  {
    id: 'name',
    question: '¡Hola! 👋 Soy tu asistente en Dilo.\n\n¿Cuál es tu nombre?',
    type: 'text',
    placeholder: 'Tu nombre…',
  },
  {
    id: 'phone',
    question: '¿Cuál es tu WhatsApp?\n\nTe contactamos ahí para ayudarte a publicar tu primer flow 💬',
    type: 'tel',
    placeholder: '+57 300 000 0000',
  },
  {
    id: 'businessType',
    question: '¿Qué describe mejor tu negocio?',
    type: 'select',
    options: [
      { value: 'agencia',      label: 'Agencia / Freelancer',    emoji: '🎨' },
      { value: 'saas',         label: 'SaaS / Tech',              emoji: '💻' },
      { value: 'inmobiliaria', label: 'Inmobiliaria',             emoji: '🏠' },
      { value: 'salud',        label: 'Salud / Bienestar',        emoji: '🏥' },
      { value: 'educacion',    label: 'Educación',                emoji: '🎓' },
      { value: 'comunidad',    label: 'Comunidad / Organización', emoji: '🤝' },
      { value: 'otro',         label: 'Otro',                     emoji: '✨' },
    ],
  },
  {
    id: 'useCase',
    question: '¿Para qué quieres usar Dilo principalmente?',
    type: 'select',
    options: [
      { value: 'calificar_leads', label: 'Calificar y capturar leads',       emoji: '🎯' },
      { value: 'cotizaciones',    label: 'Pre-cotizaciones automáticas',      emoji: '💰' },
      { value: 'discovery',       label: 'Discovery de proyectos',            emoji: '🔍' },
      { value: 'onboarding_cli',  label: 'Onboarding de clientes',            emoji: '🚀' },
      { value: 'encuestas',       label: 'Encuestas / recolección de datos',  emoji: '📊' },
      { value: 'otro',            label: 'Algo diferente',                    emoji: '🌟' },
    ],
  },
  {
    id: 'teamSize',
    question: '¡Ya casi! ¿Cuántos hay en tu equipo?',
    type: 'select',
    options: [
      { value: 'solo',   label: 'Solo yo',        emoji: '🙋' },
      { value: 'small',  label: '2 – 5 personas', emoji: '👥' },
      { value: 'medium', label: '6 – 20 personas', emoji: '🏢' },
      { value: 'large',  label: 'Más de 20',       emoji: '🏗️' },
    ],
  },
]

/* ── Main component ── */
export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const { session } = useClerk()

  const [currentStep, setCurrentStep] = useState(0)
  const [answers,     setAnswers]     = useState<Record<string, string>>({})
  const [inputValue,  setInputValue]  = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [typing,      setTyping]      = useState(false)
  // Holds the step+answer just submitted, shown during typing transition
  const [lastSubmit,  setLastSubmit]  = useState<{ step: Step; label: string } | null>(null)

  const inputRef  = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  /* ── Prefill from demo (localStorage) ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('dilo-onboarding-prefill')
      if (!raw) return
      localStorage.removeItem('dilo-onboarding-prefill')
      const data = JSON.parse(raw) as Record<string, string>
      if (!data.name) return

      const prefilled: Record<string, string> = {}
      if (data.name)         prefilled.name         = data.name
      if (data.phone)        prefilled.phone        = data.phone
      if (data.businessType) prefilled.businessType = data.businessType
      if (data.useCase)      prefilled.useCase      = data.useCase
      if (data.teamSize)     prefilled.teamSize     = data.teamSize

      setAnswers(prev => ({ ...prev, ...prefilled }))

      // If ALL required fields are pre-filled, submit silently and skip to done
      const allFilled = data.name && data.businessType && data.useCase && data.teamSize
      if (allFilled) {
        setTyping(true)
        fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:         data.name,
            phone:        data.phone,
            businessType: data.businessType,
            useCase:      data.useCase,
            teamSize:     data.teamSize,
          }),
        }).catch(() => {}).finally(() => {
          setTyping(false)
          setDone(true)
          // Skip all steps — set currentStep past end so nothing renders
          setCurrentStep(STEPS.length)
        })
        return
      }

      // Partial prefill — skip name + any other pre-filled consecutive steps
      // Find the first step not covered by prefilled data
      let skipTo = 0
      for (let i = 0; i < STEPS.length; i++) {
        if (prefilled[STEPS[i].id]) skipTo = i + 1
        else break
      }
      if (skipTo > 0) {
        setTyping(true)
        setTimeout(() => { setTyping(false); setCurrentStep(skipTo) }, 700)
      }
    } catch { /* ignore */ }
  }, [])

  /* ── Prefill name from Clerk (Google sign-in) ── */
  useEffect(() => {
    if (!isLoaded || !user) return
    const clerkName = [user.firstName, user.lastName].filter(Boolean).join(' ')
    if (clerkName) {
      setAnswers(prev => {
        if (prev.name) return prev
        return { ...prev, name: clerkName }
      })
    }
  }, [isLoaded, user])

  /* ── Auto-skip name step if pre-filled from Clerk (Google sign-in) ── */
  useEffect(() => {
    if (answers.name && currentStep === 0 && !done) {
      setTyping(true)
      setTimeout(() => { setTyping(false); setCurrentStep(1) }, 700)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.name])

  /* ── Auto-answer any step that's already prefilled (partial prefill case) ── */
  useEffect(() => {
    if (done || typing) return
    const s = STEPS[currentStep]
    if (!s) return
    const prefilled = answers[s.id]
    if (!prefilled) return
    // This step already has a value from prefill — auto-answer it
    const label = s.type === 'select'
      ? s.options.find(o => o.value === prefilled)?.label ?? prefilled
      : prefilled
    const t = setTimeout(() => doAnswer(prefilled, label, currentStep, answers), 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, done])

  /* ── Scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentStep, done, typing])

  /* ── Auto-focus text inputs ── */
  useEffect(() => {
    if (currentStep < STEPS.length && STEPS[currentStep].type === 'text' && !typing) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [currentStep, typing])

  /* ── Core answer handler ── */
  function doAnswer(value: string, label: string, stepIdx: number, currentAnswers: Record<string, string>) {
    const newAnswers = { ...currentAnswers, [STEPS[stepIdx].id]: value }
    setAnswers(newAnswers)
    setInputValue('')
    setLastSubmit({ step: STEPS[stepIdx], label })

    const isLast = stepIdx === STEPS.length - 1

    if (!isLast) {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setLastSubmit(null)
        setCurrentStep(stepIdx + 1)
      }, 750)
      return
    }

    // Last step — submit
    setSubmitting(true)
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:         newAnswers.name,
        phone:        newAnswers.phone,
        businessType: newAnswers.businessType,
        useCase:      newAnswers.useCase,
        teamSize:     newAnswers.teamSize,
      }),
    }).catch(() => {}).finally(() => {
      setSubmitting(false)
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setLastSubmit(null)
        setDone(true)
      }, 950)
    })
  }

  const handleAnswer = useCallback((value: string) => {
    const s = STEPS[currentStep]
    if (!s || !value.trim()) return
    const label = s.type === 'select'
      ? s.options.find(o => o.value === value)?.label ?? value
      : value
    doAnswer(value, label, currentStep, answers)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, currentStep])

  const handleSkip = useCallback(async () => {
    if (currentStep < STEPS.length - 1) {
      setLastSubmit(null)
      setTyping(true)
      setTimeout(() => { setTyping(false); setCurrentStep(s => s + 1) }, 700)
    } else {
      await session?.reload()
      window.location.href = '/dashboard'
    }
  }, [currentStep, session])

  if (!isLoaded) return null

  const step = STEPS[currentStep]
  const firstName = answers.name?.split(' ')[0] ?? ''
  const resolveQ  = (q: string) => q.replace('{name}', firstName || 'tú')

  // Steps shown as "history" (all completed, faded out)
  const historySteps = STEPS.slice(0, currentStep).filter(s => !!answers[s.id])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#0D0720', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#fff' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-.5px' }}>dilo</span>
        </div>
        <button
          type="button"
          onClick={async () => { await session?.reload(); window.location.href = '/dashboard' }}
          style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, transition: 'color .2s', fontFamily: 'inherit' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.65)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.35)' }}
        >
          Saltar por ahora
        </button>
      </header>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(124,58,237,.15)', flexShrink: 0 }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg,${P},${S})`, width: `${((currentStep + (done ? 1 : 0)) / STEPS.length) * 100}%`, transition: 'width .5s ease' }} />
      </div>

      {/* Conversation */}
      <div style={{ maxWidth: 520, width: '100%', margin: '0 auto', flex: 1, padding: '32px 20px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* History — faded completed steps */}
        {historySteps.map(s => {
          const val   = answers[s.id]
          const label = s.type === 'select' ? s.options.find(o => o.value === val)?.label ?? val : val
          return (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: .4, animation: 'landingSlideUp .25s ease' }}>
              <BotBubble>{resolveQ(s.question)}</BotBubble>
              <UserBubble>{label}</UserBubble>
            </div>
          )
        })}

        {/* "Just submitted" — shows during typing transition */}
        {typing && lastSubmit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: .65, animation: 'landingSlideUp .2s ease' }}>
            <BotBubble>{resolveQ(lastSubmit.step.question)}</BotBubble>
            <UserBubble>{lastSubmit.label}</UserBubble>
          </div>
        )}

        {/* Typing indicator */}
        {typing && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', animation: 'landingSlideUp .2s ease' }}>
            <Avatar />
            <div style={{ padding: '13px 16px', borderRadius: '4px 18px 18px 18px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', display: 'inline-flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(j => (
                <span key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4B5FD', display: 'block', animation: `landingBounce 1.2s ${j * .2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {done && !typing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'landingSlideUp .3s ease' }}>
            <BotBubble>
              {firstName
                ? `¡Todo listo, ${firstName}! 🎉\n\nYa tengo tu perfil completo. Vamos a crear tu primer flow — menos de 2 minutos 🚀`
                : `¡Perfecto! 🎉 Ya tengo todo lo que necesito.\n\nVamos a crear tu primer flow — te va a tomar menos de 2 minutos 🚀`}
            </BotBubble>
            <div style={{ paddingLeft: 44 }}>
              <button
                type="button"
                onClick={() => { window.location.href = '/dashboard' }}
                style={{ width: '100%', background: P, color: '#fff', border: 'none', borderRadius: 100, padding: '16px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: `0 6px 28px ${P}50`, transition: 'opacity .15s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
              >
                Ir al dashboard →
              </button>
            </div>
          </div>
        )}

        {/* Current question */}
        {!typing && !done && step && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'landingSlideUp .25s ease' }}>
            <BotBubble>{resolveQ(step.question)}</BotBubble>

            {step.type === 'select' ? (
              <div style={{ paddingLeft: 44, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {step.options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAnswer(opt.value)}
                    style={{ background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 100, padding: '10px 18px', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.85)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'all .15s', fontFamily: 'inherit' }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = `${P}80`; el.style.background = `${P}20`; el.style.color = '#fff' }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(255,255,255,.12)'; el.style.background = 'rgba(255,255,255,.06)'; el.style.color = 'rgba(255,255,255,.85)' }}
                  >
                    <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ paddingLeft: 44, display: 'flex', gap: 10 }}>
                <input
                  ref={inputRef}
                  type={step.type}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAnswer(inputValue) }}
                  placeholder={step.placeholder}
                  disabled={submitting}
                  style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 100, padding: '13px 20px', fontSize: 15, color: '#fff', outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s' }}
                  onFocus={e => { e.target.style.borderColor = `${P}70` }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)' }}
                />
                <button
                  type="button"
                  onClick={() => handleAnswer(inputValue)}
                  disabled={submitting || !inputValue.trim()}
                  style={{ width: 48, height: 48, borderRadius: '50%', background: inputValue.trim() ? P : 'rgba(255,255,255,.1)', border: 'none', cursor: inputValue.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s', flexShrink: 0 }}
                >
                  {submitting
                    ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', display: 'block', animation: 'spin .8s linear infinite' }} />
                    : <ArrowRightIcon style={{ width: 18, height: 18, color: inputValue.trim() ? '#fff' : 'rgba(255,255,255,.3)' } as React.CSSProperties} strokeWidth={2.5} />
                  }
                </button>
              </div>
            )}

            <div style={{ paddingLeft: 44, textAlign: 'right' }}>
              <button
                type="button"
                onClick={handleSkip}
                style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', transition: 'color .15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.3)' }}
              >
                Saltar esta pregunta
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function Avatar() {
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>D</div>
  )
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Avatar />
      <div style={{ maxWidth: '82%', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '4px 18px 18px 18px', padding: '13px 18px', fontSize: 15, lineHeight: 1.65, whiteSpace: 'pre-line', color: 'rgba(255,255,255,.92)' }}>
        {children}
      </div>
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '72%', background: P, borderRadius: '18px 4px 18px 18px', padding: '13px 18px', fontSize: 15, lineHeight: 1.65, color: '#fff', boxShadow: `0 2px 12px ${P}40` }}>
        {children}
      </div>
    </div>
  )
}
