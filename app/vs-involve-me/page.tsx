import type { Metadata } from 'next'
import Link from 'next/link'
import { BlogShell } from '@/components/blog/blog-shell'

export const metadata: Metadata = {
  title: 'Dilo vs Involve.me — Comparativa 2026',
  description:
    'Comparativa honesta entre Dilo e Involve.me: precios, casos de uso y cuál elegir según lo que necesitas hacer con tus datos.',
  alternates: { canonical: 'https://getdilo.io/vs-involve-me' },
  openGraph: {
    title: 'Dilo vs Involve.me — ¿Cuál conviene más?',
    description:
      'Comparativa honesta entre Dilo e Involve.me: precios, casos de uso y cuál elegir según lo que necesitas hacer con tus datos.',
    url: 'https://getdilo.io/vs-involve-me',
    siteName: 'Dilo',
    locale: 'es_CO',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Dilo vs Involve.me' }],
  },
}

function FaqJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: 'https://getdilo.io/vs-involve-me',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Es Dilo una alternativa a Involve.me?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Sí, aunque con un enfoque diferente. Involve.me está orientado a interactive content: calculadoras, quizzes, funnels visuales. Dilo está orientado a la activación de datos: genera el flow desde texto con IA, produce un resumen automático al terminar y clasifica el lead. Si tu objetivo es capturar y calificar leads o hacer discovery de proyectos, Dilo es más directo.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cuánto cuesta Involve.me comparado con Dilo?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Involve.me tiene un plan gratuito muy limitado (100 submissions/mes, sin lógica condicional avanzada). El plan básico empieza en $29/mes. Dilo ofrece un plan gratuito sin tarjeta de crédito con flows ilimitados para empezar.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué hace Dilo que Involve.me no hace?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Dilo genera el formulario conversacional automáticamente desde una descripción en texto — no campo por campo. Al terminar cada sesión, produce un resumen estructurado de las respuestas y un score del lead. Involve.me no tiene generación por IA ni interpretación automática de respuestas.',
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function VsInvolveMePage() {
  return (
    <BlogShell>
      <FaqJsonLd />
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">

        {/* Back */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-[rgba(124,58,237,0.25)] hover:text-foreground dark:bg-[#161a26]/80"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al inicio
        </Link>

        <article className="overflow-hidden rounded-3xl border border-[rgba(124,58,237,0.12)] bg-surface/95 shadow-xl shadow-dilo-500/6 backdrop-blur-sm dark:border-[rgba(124,58,237,0.2)] dark:bg-[#12151f]/95 dark:shadow-black/40">
          <div className="h-1 w-full bg-linear-to-r from-dilo-500 via-dilo-600 to-mint-500" aria-hidden />

          <div className="px-5 py-9 sm:px-10 sm:py-11 lg:px-12 lg:py-12">
            <div className="mx-auto max-w-2xl">

              {/* Badge */}
              <span className="inline-flex items-center rounded-full bg-dilo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-dilo-600 dark:bg-[rgba(124,58,237,0.2)] dark:text-[#DDD6FE]">
                Comparativa 2026
              </span>

              <h1 className="mt-5 text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
                Dilo vs Involve.me — ¿Cuál conviene más?
              </h1>

              <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Comparativa honesta. Involve.me es buena herramienta — pero están optimizadas para cosas distintas.
                Aquí te ayudamos a elegir.
              </p>

              <div className="dilo-prose dilo-prose--blog mt-10 border-t border-border-subtle pt-10">

                {/* ── Intro ── */}
                <p>
                  <strong>Involve.me</strong> y <strong>Dilo</strong> comparten el mismo punto de partida: reemplazar
                  formularios estáticos por experiencias más interactivas. Pero el destino es diferente.
                </p>
                <p>
                  Involve.me está pensado para <em>interactive content</em>: calculadoras de precio, quizzes de
                  recomendación de productos, funnels visuales con múltiples resultados. Dilo está pensado para{' '}
                  <em>activación de datos</em>: capturar información de leads o clientes, interpretarla
                  automáticamente y ejecutar una acción (scoring, resumen, webhook, integración).
                </p>
                <p>
                  Si necesitas una calculadora de ROI embebida en tu landing — Involve.me lo hace bien. Si necesitas
                  pre-calificar leads antes de una reunión o hacer discovery de proyectos sin reuniones — Dilo es más
                  directo.
                </p>

                {/* ── Tabla ── */}
                <h2>Comparativa directa</h2>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Involve.me</th>
                        <th>Dilo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Creación del formulario</strong></td>
                        <td>Editor visual, campo por campo</td>
                        <td>Desde texto en lenguaje natural (IA)</td>
                      </tr>
                      <tr>
                        <td><strong>UX conversacional</strong></td>
                        <td>✅ Sí (una pregunta por pantalla)</td>
                        <td>✅ Sí (formato chat)</td>
                      </tr>
                      <tr>
                        <td><strong>Calculadoras / quizzes</strong></td>
                        <td>✅ Nativo</td>
                        <td>❌ No es el foco</td>
                      </tr>
                      <tr>
                        <td><strong>Resumen automático de respuestas</strong></td>
                        <td>❌ No</td>
                        <td>✅ Sí, por cada sesión</td>
                      </tr>
                      <tr>
                        <td><strong>Scoring de leads</strong></td>
                        <td>❌ No</td>
                        <td>✅ Sí, automático</td>
                      </tr>
                      <tr>
                        <td><strong>Lógica condicional</strong></td>
                        <td>✅ Avanzada (plan pago)</td>
                        <td>✅ Básica (generada por IA)</td>
                      </tr>
                      <tr>
                        <td><strong>Integraciones</strong></td>
                        <td>Zapier, HubSpot, Mailchimp</td>
                        <td>Google Sheets, n8n, webhooks</td>
                      </tr>
                      <tr>
                        <td><strong>Embed en web</strong></td>
                        <td>✅</td>
                        <td>✅</td>
                      </tr>
                      <tr>
                        <td><strong>Plan gratuito real</strong></td>
                        <td>100 submissions/mes, sin lógica avanzada</td>
                        <td>Gratis para empezar, sin tarjeta</td>
                      </tr>
                      <tr>
                        <td><strong>Precio de entrada</strong></td>
                        <td>$29/mes</td>
                        <td>Gratis</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ── Cuándo cada uno ── */}
                <h2>Cuándo elegir Involve.me</h2>
                <p>Involve.me tiene sentido cuando tu objetivo es <strong>interactive content</strong> que vive en una página:</p>
                <ul>
                  <li>Calculadora de precio o ROI embebida en tu landing</li>
                  <li>Quiz de recomendación de producto ("¿qué plan es para ti?")</li>
                  <li>Encuesta de satisfacción con resultado visual inmediato</li>
                  <li>Funnel con múltiples salidas visuales distintas según la respuesta</li>
                </ul>
                <p>
                  Si el resultado del formulario es una experiencia visual personalizada para el usuario —
                  Involve.me está construido para eso.
                </p>

                <h2>Cuándo elegir Dilo</h2>
                <p>
                  Dilo tiene sentido cuando el resultado del formulario es una <strong>acción interna</strong> —
                  algo que tú o tu equipo necesita hacer con los datos:
                </p>
                <ul>
                  <li>
                    <strong>Pre-calificación de leads:</strong> el flow pregunta presupuesto, plazo e intención, y
                    al terminar te llega un resumen con el score del lead — sin que nadie tenga que leer las
                    respuestas.
                  </li>
                  <li>
                    <strong>Discovery de proyectos:</strong> en lugar de una reunión de 30 minutos para entender
                    qué necesita un cliente, envías un flow. El cliente responde en 3 minutos y tú recibes el
                    briefing estructurado.
                  </li>
                  <li>
                    <strong>Onboarding de clientes:</strong> solicita accesos, activos y requisitos en formato
                    conversacional, con resumen automático al finalizar.
                  </li>
                  <li>
                    <strong>Captura masiva con segmentación:</strong> el flow captura y clasifica al mismo tiempo,
                    sin pasos manuales posteriores.
                  </li>
                </ul>

                {/* ── La diferencia real ── */}
                <h2>La diferencia que importa</h2>
                <p>
                  Con Involve.me, el trabajo termina cuando el usuario envía el formulario. Los datos llegan a una
                  hoja o a un CRM — y alguien del equipo tiene que leerlos, interpretarlos y decidir qué hacer.
                </p>
                <p>
                  Con Dilo, cuando el usuario envía es cuando el trabajo útil empieza: el sistema genera el resumen,
                  clasifica el lead y puede disparar una integración. El equipo actúa sobre conclusiones, no sobre
                  datos crudos.
                </p>
                <blockquote>
                  <p>
                    La pregunta no es cuál tiene más features — es qué pasa con los datos después de que el usuario
                    presiona enviar.
                  </p>
                </blockquote>

                {/* ── FAQ ── */}
                <h2>Preguntas frecuentes</h2>

                <h3>¿Es Dilo una alternativa a Involve.me?</h3>
                <p>
                  Sí, aunque con enfoque diferente. Involve.me está orientado a interactive content: calculadoras,
                  quizzes, funnels visuales. Dilo está orientado a la activación de datos: genera el flow desde
                  texto con IA, produce un resumen automático al terminar y clasifica el lead. Si tu objetivo es
                  capturar y calificar leads o hacer discovery de proyectos, Dilo es más directo.
                </p>

                <h3>¿Cuánto cuesta Involve.me comparado con Dilo?</h3>
                <p>
                  Involve.me tiene un plan gratuito limitado (100 submissions/mes, sin lógica condicional avanzada).
                  El plan básico empieza en $29/mes. Dilo ofrece un plan gratuito sin tarjeta de crédito para
                  empezar.
                </p>

                <h3>¿Qué hace Dilo que Involve.me no hace?</h3>
                <p>
                  Dilo genera el formulario conversacional automáticamente desde una descripción en texto — no campo
                  por campo. Al terminar cada sesión, produce un resumen estructurado de las respuestas y un score
                  del lead. Involve.me no tiene generación por IA ni interpretación automática de respuestas.
                </p>

                {/* ── CTA ── */}
                <div className="not-prose mt-10 flex flex-col items-center gap-3 rounded-2xl border border-[rgba(124,58,237,0.15)] bg-dilo-50/60 px-6 py-8 text-center dark:border-[rgba(124,58,237,0.25)] dark:bg-[rgba(124,58,237,0.08)]">
                  <p className="text-base font-semibold text-foreground">
                    Prueba Dilo gratis — sin tarjeta de crédito
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Describe lo que necesitas y en 20 segundos tienes un flow listo para compartir.
                  </p>
                  <Link
                    href="/sign-up"
                    className="dilo-mdx-cta mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-dilo-500/30 ring-1 ring-white/15 transition hover:opacity-[0.97] hover:shadow-xl hover:shadow-dilo-500/35 active:scale-[0.99]"
                  >
                    Crear mi primer flow gratis
                  </Link>
                </div>

              </div>
            </div>
          </div>
        </article>
      </div>
    </BlogShell>
  )
}
