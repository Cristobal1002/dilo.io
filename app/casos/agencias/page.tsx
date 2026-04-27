import type { Metadata } from 'next'
import Link from 'next/link'
import { BlogShell } from '@/components/blog/blog-shell'

export const metadata: Metadata = {
  title: 'Dilo para agencias — Pre-cotización automática sin reuniones',
  description:
    'Cómo las agencias digitales usan Dilo para calificar clientes, hacer discovery de proyectos y generar briefings automáticos antes de la primera reunión.',
  alternates: { canonical: 'https://getdilo.io/casos/agencias' },
  openGraph: {
    title: 'Dilo para agencias — Pre-cotización automática sin reuniones',
    description:
      'Cómo las agencias digitales usan Dilo para calificar clientes, hacer discovery de proyectos y generar briefings automáticos antes de la primera reunión.',
    url: 'https://getdilo.io/casos/agencias',
    siteName: 'Dilo',
    locale: 'es_CO',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Dilo para agencias' }],
  },
}

function FaqJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: 'https://getdilo.io/casos/agencias',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Cómo usan Dilo las agencias para pre-calificar clientes?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'La agencia crea un flow de Dilo con las preguntas clave de su proceso de discovery: tipo de proyecto, presupuesto, plazo, si tienen marca definida, qué resultados esperan. Cuando alguien pide una cotización, recibe el link del flow. Al terminar, el equipo comercial recibe un resumen automático con el score del lead y decide si vale la pena agendar una reunión.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué información debe capturar una agencia en el flow de pre-cotización?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Las preguntas más útiles para una agencia son: tipo de servicio requerido (web, branding, pauta, SEO), presupuesto disponible en rangos, plazo de entrega esperado, si ya tienen identidad visual o contenido base, y qué resultado específico quieren lograr. Con estas respuestas se puede hacer una propuesta sin reunión exploratoria previa.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Puede una agencia usar Dilo para múltiples tipos de proyectos?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sí. En Dilo se pueden crear flows distintos para cada tipo de servicio: uno para proyectos web, otro para branding, otro para campañas de pauta. Cada flow tiene las preguntas específicas de ese servicio y genera un briefing diferente al terminar. El link correcto se comparte según el tipo de consulta que llega.',
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

export default function CasosAgenciasPage() {
  return (
    <BlogShell>
      <FaqJsonLd />
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">

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

              <span className="inline-flex items-center rounded-full bg-dilo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-dilo-600 dark:bg-[rgba(124,58,237,0.2)] dark:text-[#DDD6FE]">
                Caso de uso — Agencias
              </span>

              <h1 className="mt-5 text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
                Cómo las agencias usan Dilo para pre-cotizar sin reuniones exploratorias
              </h1>

              <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                El cuello de botella de cualquier agencia no es la capacidad de hacer el trabajo — es el tiempo que
                se pierde entendiendo qué trabajo hay que hacer.
              </p>

              <div className="dilo-prose dilo-prose--blog mt-10 border-t border-border-subtle pt-10">

                {/* Historia concreta */}
                <p>
                  Una agencia de diseño y desarrollo recibe entre 15 y 20 consultas por mes. Cada consulta termina
                  en una llamada de discovery de 30-40 minutos. De esas 20 llamadas, 12 no avanzan: el presupuesto
                  no calza, el plazo es irreal o el cliente no sabe todavía qué quiere.
                </p>
                <p>
                  El costo real no es solo el tiempo de la llamada — es el tiempo de preparación, el seguimiento
                  posterior y la carga cognitiva de entender proyectos que nunca van a existir.
                </p>
                <p>
                  Con Dilo, la agencia reemplaza esa llamada exploratoria con un flow de pre-cotización. El cliente
                  responde en 3 minutos, la agencia recibe un briefing estructurado, y la llamada que sí ocurre
                  empieza directamente en la propuesta — no en "cuéntame de tu empresa".
                </p>

                <h2>El flujo completo</h2>
                <p>
                  Así funciona el proceso una vez que la agencia tiene el flow configurado en Dilo:
                </p>
                <ul>
                  <li>
                    <strong>Consulta entra</strong> — por Instagram, formulario de contacto, referido o LinkedIn.
                  </li>
                  <li>
                    <strong>Respuesta automática incluye el link</strong> — "Para prepararte una propuesta precisa,
                    completa este formulario rápido antes de agendar: [link]". El cliente lo hace en 3 minutos.
                  </li>
                  <li>
                    <strong>El equipo recibe el briefing</strong> — resumen estructurado con tipo de proyecto,
                    presupuesto, plazo, si tienen brand assets, qué resultado esperan y score del lead.
                  </li>
                  <li>
                    <strong>Decisión sin reunión</strong> — si el lead no califica (presupuesto irreal, plazo
                    imposible), se responde por escrito con honestidad. Si califica, la reunión ya tiene agenda
                    concreta.
                  </li>
                </ul>

                <h2>Qué preguntas incluir en el flow de una agencia</h2>
                <p>
                  El flow ideal de pre-cotización para agencias tiene entre 6 y 8 preguntas. Más que eso genera
                  abandono. Menos que eso deja huecos en el briefing.
                </p>

                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Pregunta</th>
                        <th>Tipo de campo</th>
                        <th>Por qué importa</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>¿Qué tipo de proyecto necesitas?</td>
                        <td>Selección múltiple</td>
                        <td>Determina qué equipo y qué proceso aplica</td>
                      </tr>
                      <tr>
                        <td>¿Cuál es tu presupuesto disponible?</td>
                        <td>Rangos (select)</td>
                        <td>Primer filtro de calificación</td>
                      </tr>
                      <tr>
                        <td>¿Cuándo necesitas tener el resultado?</td>
                        <td>Selección</td>
                        <td>Detecta urgencia real vs. exploración</td>
                      </tr>
                      <tr>
                        <td>¿Ya tienen identidad visual definida?</td>
                        <td>Sí / No / En proceso</td>
                        <td>Determina el alcance real del proyecto</td>
                      </tr>
                      <tr>
                        <td>¿Tienen contenido listo (textos, fotos)?</td>
                        <td>Sí / No / Parcial</td>
                        <td>Afecta el tiempo de producción</td>
                      </tr>
                      <tr>
                        <td>¿Qué resultado específico esperan lograr?</td>
                        <td>Texto libre</td>
                        <td>Revela si el cliente tiene claridad real</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p>
                  La pregunta de presupuesto siempre en rangos — nunca campo numérico libre. Los clientes responden
                  más cuando no sienten que están negociando desde el primer momento.
                </p>

                <h2>Un flow por tipo de servicio</h2>
                <p>
                  Las agencias con mayor volumen de consultas crean flows distintos según el servicio. No es lo
                  mismo pre-cotizar un sitio web que una campaña de pauta o un proyecto de branding — las preguntas
                  relevantes son diferentes.
                </p>
                <p>
                  En Dilo se pueden tener múltiples flows activos al mismo tiempo. El link correcto se comparte
                  según el tipo de consulta que llega:
                </p>
                <ul>
                  <li>Alguien pregunta por un sitio web → link al flow de proyectos web</li>
                  <li>Alguien pregunta por redes sociales → link al flow de gestión de contenido</li>
                  <li>Alguien pregunta por identidad → link al flow de branding</li>
                </ul>
                <p>
                  Cada flow genera un briefing específico para ese tipo de proyecto, sin preguntas genéricas que no
                  aplican.
                </p>

                <h2>Cómo se usa el scoring</h2>
                <p>
                  Al terminar el flow, Dilo genera un score automático del lead. Las agencias suelen configurarlo
                  así:
                </p>
                <ul>
                  <li>
                    <strong>Prioritario:</strong> presupuesto en rango realista, plazo de más de 4 semanas,
                    contenido listo o en proceso. → Agendar reunión de propuesta esta semana.
                  </li>
                  <li>
                    <strong>Secundario:</strong> presupuesto ajustado o plazo corto, pero proyecto claro. → Respuesta
                    con opciones de alcance reducido.
                  </li>
                  <li>
                    <strong>No calificado:</strong> presupuesto fuera de rango o plazo imposible. → Respuesta
                    honesta por escrito, sin reunión.
                  </li>
                </ul>

                <h2>El resultado para el equipo</h2>
                <p>
                  Una agencia que implementa este flujo no solo ahorra tiempo en llamadas — cambia la dinámica
                  completa del equipo comercial:
                </p>
                <ul>
                  <li>El account llega a cada reunión con contexto real, no con supuestos</li>
                  <li>Las propuestas son más precisas porque parten de datos declarados, no de intuición</li>
                  <li>El cliente que completa el flow llega más comprometido — ya invirtió tiempo y atención</li>
                  <li>El pipeline se puede gestionar sin CRM complejo: el briefing de Dilo es el registro</li>
                </ul>

                {/* CTA */}
                <div className="not-prose mt-10 flex flex-col items-center gap-3 rounded-2xl border border-[rgba(124,58,237,0.15)] bg-dilo-50/60 px-6 py-8 text-center dark:border-[rgba(124,58,237,0.25)] dark:bg-[rgba(124,58,237,0.08)]">
                  <p className="text-base font-semibold text-foreground">
                    Crea el flow de pre-cotización de tu agencia
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Describe lo que necesitas saber de tus clientes y Dilo genera el flow en segundos. Gratis para
                    empezar, sin tarjeta de crédito.
                  </p>
                  <Link
                    href="/sign-up"
                    className="dilo-mdx-cta mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-dilo-500/30 ring-1 ring-white/15 transition hover:opacity-[0.97] hover:shadow-xl hover:shadow-dilo-500/35 active:scale-[0.99]"
                  >
                    Crear mi flow de pre-cotización gratis
                  </Link>
                </div>

                {/* FAQ */}
                <h2>Preguntas frecuentes</h2>

                <h3>¿Cómo usan Dilo las agencias para pre-calificar clientes?</h3>
                <p>
                  La agencia crea un flow con las preguntas clave de su proceso de discovery: tipo de proyecto,
                  presupuesto, plazo, si tienen marca definida, qué resultados esperan. Cuando alguien pide una
                  cotización, recibe el link del flow. Al terminar, el equipo recibe un resumen con el score del
                  lead y decide si vale la pena agendar reunión.
                </p>

                <h3>¿Qué información debe capturar una agencia en el flow de pre-cotización?</h3>
                <p>
                  Las preguntas más útiles: tipo de servicio requerido, presupuesto en rangos, plazo de entrega
                  esperado, si ya tienen identidad visual o contenido base, y qué resultado específico quieren
                  lograr. Con estas respuestas se puede hacer una propuesta sin reunión exploratoria previa.
                </p>

                <h3>¿Puede una agencia usar Dilo para múltiples tipos de proyectos?</h3>
                <p>
                  Sí. Se pueden crear flows distintos para cada tipo de servicio: uno para proyectos web, otro para
                  branding, otro para campañas de pauta. Cada flow genera un briefing específico. El link correcto
                  se comparte según el tipo de consulta que llega.
                </p>

              </div>
            </div>
          </div>
        </article>
      </div>
    </BlogShell>
  )
}
