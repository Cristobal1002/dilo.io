'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const PRIMARY = '#7C3AED'
const SECONDARY = '#06B6D4'

type FlowItem =
  | { from: 'bot'; text: string | ((name: string) => string) }
  | { from: 'user' }

const IFLOW: FlowItem[] = [
  { from: 'bot', text: '¡Hola! 👋 Soy el asistente de Dilo.\n\nUna pregunta a la vez. Sin formularios. ¿Cuál es tu nombre?' },
  { from: 'user' },
  { from: 'bot', text: (name: string) => `¡Mucho gusto, ${name}! ✨\n\n¿En qué industria trabajas?` },
  { from: 'user' },
  { from: 'bot', text: '¿Cuántos leads quieres capturar por mes?' },
  { from: 'user' },
  { from: 'bot', text: '¡Perfecto! Con Dilo puedes lograrlo sin escribir código 🚀\n\n¿Tu email para enviarte info?' },
  { from: 'user' },
  { from: 'bot', text: '¡Listo! Quedaste registrado. Revisa tu inbox 📬' },
]

type Msg = { from: 'bot' | 'user'; text: string }

export default function ChatDemoInteractive() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [step, setStep] = useState(0)
  const [typing, setTyping] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [done, setDone] = useState(false)
  const [started, setStarted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const botTotal = IFLOW.filter(m => m.from === 'bot').length
  const botShown = messages.filter(m => m.from === 'bot').length
  const pct = Math.round((botShown / botTotal) * 100)

  const addBot = useCallback((idx: number, userName: string) => {
    if (idx >= IFLOW.length) { setDone(true); return }
    const item = IFLOW[idx]
    if (item.from !== 'bot') return
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      const text = typeof item.text === 'function' ? item.text(userName) : item.text
      setMessages(prev => [...prev, { from: 'bot', text }])
      setStep(idx + 1)
    }, 900)
  }, [])

  function start() {
    setStarted(true)
    addBot(0, '')
    setTimeout(() => inputRef.current?.focus(), 1200)
  }

  function send() {
    if (!inputVal.trim() || typing || done) return
    const val = inputVal.trim()
    setMessages(prev => [...prev, { from: 'user', text: val }])
    setInputVal('')
    const nextBot = step + 1
    if (nextBot < IFLOW.length && IFLOW[nextBot].from === 'bot') {
      setTimeout(() => addBot(nextBot, val), 400)
    } else if (nextBot >= IFLOW.length) {
      setDone(true)
    }
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, typing])

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 28,
      overflow: 'hidden',
      width: 400,
      maxWidth: '100%',
      boxShadow: '0 32px 100px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.06)',
      fontFamily: 'var(--font-dilo-sans), Space Grotesk, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #F0EBFF' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>D</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Flow Demo · Dilo</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'landingPulse 2s infinite' }} />
            En línea ahora
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: PRIMARY }}>{pct}%</div>
      </div>
      {/* Progress */}
      <div style={{ height: 4, background: '#F0EBFF' }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg,${PRIMARY},${SECONDARY})`, width: `${pct}%`, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ padding: '8px 20px', fontSize: 12, color: '#9CA3AF', fontWeight: 500, textAlign: 'center' }}>
        {botShown} de {botTotal} · seguimos cuando quieras
      </div>
      {/* Messages */}
      <div ref={scrollRef} style={{ padding: '8px 16px 16px', minHeight: 300, maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!started && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💬</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 6 }}>Demo interactivo</div>
              <div style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.5 }}>Responde las preguntas y mira<br/>cómo se siente para tu usuario.</div>
            </div>
            <button
              onClick={start}
              style={{
                background: PRIMARY, color: '#fff', border: 'none',
                borderRadius: 100, padding: '13px 32px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', boxShadow: `0 4px 20px ${PRIMARY}45`,
                fontFamily: 'inherit'
              }}
            >Comenzar →</button>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end', animation: 'landingSlideUp 0.2s ease' }}>
            {m.from === 'bot' && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>D</div>
            )}
            <div style={{
              maxWidth: '76%', padding: '11px 15px', whiteSpace: 'pre-line',
              borderRadius: m.from === 'bot' ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
              background: m.from === 'bot' ? '#fff' : PRIMARY,
              color: m.from === 'bot' ? '#111827' : '#fff',
              fontSize: 14, lineHeight: 1.55, fontWeight: m.from === 'bot' ? 500 : 400,
              boxShadow: m.from === 'bot' ? '0 1px 8px rgba(0,0,0,0.07)' : `0 2px 10px ${PRIMARY}40`,
              border: m.from === 'bot' ? '1px solid #F0EBFF' : 'none',
            }}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>D</div>
            <div style={{ padding: '11px 15px', borderRadius: '4px 18px 18px 18px', background: '#fff', border: '1px solid #F0EBFF', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(j => (
                <span key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4B5FD', display: 'block', animation: `landingBounce 1.2s ${j * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #F0EBFF', background: '#FAFAFA' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '13px', background: '#F0FDF4', borderRadius: 100, color: '#16A34A', fontWeight: 700, fontSize: 14 }}>🎉 ¡Lead capturado exitosamente!</div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={!started || typing}
              placeholder={started ? 'Escribe tu respuesta...' : 'Iniciando...'}
              style={{
                flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 100,
                padding: '11px 18px', fontSize: 14, outline: 'none',
                fontFamily: 'inherit', color: '#111827',
                background: '#fff', transition: 'border-color 0.2s'
              }}
              onFocus={e => { e.target.style.borderColor = PRIMARY }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB' }}
            />
            <button
              onClick={send}
              disabled={!inputVal.trim()}
              style={{
                background: inputVal.trim() ? PRIMARY : '#E5E7EB',
                color: inputVal.trim() ? '#fff' : '#9CA3AF',
                border: 'none', borderRadius: 100,
                padding: '11px 20px', fontSize: 14, fontWeight: 600,
                cursor: inputVal.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
                transition: 'background 0.2s'
              }}
            >Enviar →</button>
          </div>
        )}
      </div>
    </div>
  )
}
