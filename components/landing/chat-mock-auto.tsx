'use client'

import { useState, useEffect, useRef } from 'react'

const PRIMARY   = '#7C3AED'
const SECONDARY = '#06B6D4'

const DEMO_FLOW = [
  { from: 'bot',  text: '¡Hola! 👋 Soy el asistente de Dilo.\n\nVoy a ayudarte a capturar leads — sin formularios aburridos, una pregunta a la vez.\n\n¿Cuál es tu nombre completo?' },
  { from: 'user', text: 'Andrea Morales' },
  { from: 'bot',  text: '¡Mucho gusto, Andrea! ✨\n\n¿Cuál es tu empresa o agencia?' },
  { from: 'user', text: 'Agencia Digital MX' },
  { from: 'bot',  text: 'Perfecto. ¿Cuántos leads necesitas capturar al mes?' },
  { from: 'user', text: 'Entre 500 y 1,000' },
  { from: 'bot',  text: '¡Genial! Con Dilo lo logras sin escribir una sola línea de código 🚀\n\n¿Te enviamos info a tu email?' },
  { from: 'user', text: 'andrea@agenciadmx.com' },
  { from: 'bot',  text: '¡Listo, Andrea! Revisa tu inbox 📬\nTe contactamos en menos de 24h.' },
] as const

type Msg = { from: 'bot' | 'user'; text: string }

const BackArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
)

export default function ChatMockAuto() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [typing,   setTyping]   = useState(false)
  const [done,     setDone]     = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let idx = 0, cancelled = false
    function next() {
      if (cancelled || idx >= DEMO_FLOW.length) { if (!cancelled) setDone(true); return }
      const msg = DEMO_FLOW[idx]
      if (msg.from === 'bot') {
        setTyping(true)
        setTimeout(() => {
          if (cancelled) return
          setTyping(false)
          setMessages(p => [...p, { from: 'bot', text: msg.text }])
          idx++; setTimeout(next, 1000)
        }, 900)
      } else {
        setTimeout(() => {
          if (cancelled) return
          setMessages(p => [...p, { from: 'user', text: msg.text }])
          idx++; setTimeout(next, 500)
        }, 500)
      }
    }
    setTimeout(next, 700)
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, typing])

  const botTotal = DEMO_FLOW.filter(m => m.from === 'bot').length
  const botShown = messages.filter(m => m.from === 'bot').length
  const pct = Math.round((botShown / botTotal) * 100)

  return (
    <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', width: 360, maxWidth: '100%', boxShadow: '0 24px 80px rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.08)', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #F0EBFF' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F4F1FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BackArrow />
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>D</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>dilo</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: PRIMARY }}>{pct}%</div>
      </div>
      {/* Progress */}
      <div style={{ height: 4, background: '#F0EBFF' }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg,${PRIMARY},${SECONDARY})`, width: `${pct}%`, transition: 'width .5s ease' }} />
      </div>
      <div style={{ padding: '10px 18px', fontSize: 12, color: '#9CA3AF', fontWeight: 500, textAlign: 'center' }}>
        {botShown} de {botTotal} · seguimos cuando quieras
      </div>
      {/* Messages */}
      <div ref={scrollRef} style={{ padding: '8px 14px 16px', minHeight: 280, maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end', animation: 'landingSlideUp .25s ease' }}>
            {m.from === 'bot' && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>D</div>
            )}
            <div style={{ maxWidth: '76%', padding: '11px 15px', borderRadius: m.from === 'bot' ? '4px 18px 18px 18px' : '18px 4px 18px 18px', background: m.from === 'bot' ? '#fff' : PRIMARY, color: m.from === 'bot' ? '#111827' : '#fff', fontSize: 13.5, lineHeight: 1.55, fontWeight: m.from === 'bot' ? 500 : 400, boxShadow: m.from === 'bot' ? '0 1px 8px rgba(0,0,0,.07)' : `0 2px 10px ${PRIMARY}40`, border: m.from === 'bot' ? '1px solid #F0EBFF' : 'none', whiteSpace: 'pre-line' }}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>D</div>
            <div style={{ padding: '11px 15px', borderRadius: '4px 18px 18px 18px', background: '#fff', border: '1px solid #F0EBFF', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(j => (
                <span key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4B5FD', display: 'block', animation: `landingBounce 1.2s ${j * .2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #F0EBFF', background: '#FAFAFA' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '11px', background: '#F0FDF4', borderRadius: 100, color: '#16A34A', fontWeight: 600, fontSize: 13 }}>🎉 ¡Lead capturado!</div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly placeholder="tu@correo.com" style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 100, padding: '10px 16px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#9CA3AF', background: '#fff', cursor: 'default' }} />
            <button disabled style={{ background: '#E5E7EB', color: '#9CA3AF', border: 'none', borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'default', whiteSpace: 'nowrap' }}>Enviar →</button>
          </div>
        )}
      </div>
    </div>
  )
}
