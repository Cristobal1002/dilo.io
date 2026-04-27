import type { Metadata } from 'next'
import Link from 'next/link'
import { BlogShell } from '@/components/blog/blog-shell'

export const metadata: Metadata = {
  title: 'Dilo para consultores — Discovery sin reuniones previas',
  description:
    'Cómo los consultores usan Dilo para calificar proyectos antes de la primera reunión. Menos tiempo de discovery, mejores briefings, más cierres.',
  alternates: { canonical: 'https://getdilo.io/casos/consultores' },
  openGraph: {
    title: 'Dilo para consultores — Discovery sin reuniones previas',
    description:
      'Cómo los consultores usan Dilo para calificar proyectos antes de la primera reunión. Menos tiempo de discovery, mejores briefings, más cierres.',
    url: 'https://getdilo.io/casos/consultores',
    siteName: 'Dilo',
    locale: 'es_CO',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Dilo para consultores' }],
  },
}

function FaqJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: 'https://getdilo.io/casos/consultores',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Cómo usan Dilo los consultores para hacer discovery?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'El consultor crea un flow en Dilo describiendo qué información necesita del cliente potencial: tipo de proyecto, presupuesto en rangos, plazo, situación actual. Comparte el link por WhatsApp o email antes de la primera reunión. El cliente responde en 3 minutos y el consultor recibe un briefing estructurado y listo para cotizar, sin haber tenido que agendar una reunión exploratoria.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cuánto tiempo ahorra un consultor usando flows de Dilo?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Un consultor que recibe 10 solicitudes de proyecto por semana y hace reuniones de discovery de 30-45 minutos cada una puede eliminar entre 5 y 7 horas semanales de reuniones exploratorias. El flow reemplaza la reunión de discovery en la mayoría de los casos, y cuando la reunión es necesaria, empieza directamente en la propuesta.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué preguntas debe incluir un flow de discovery para consultores?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Las más efectivas son: tipo de proyecto o servicio requerido, presupuesto disponible (en rangos), plazo de inicio y duración estimada, situación actual del cliente (¿ya tienen algo avanzado?), y objetivo principal que esperan lograr. Con estas cinco dimensiones el consultor puede pre-calificar el lead y preparar una propuesta sin reuniones previas.',
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

export default function CasosConsultoresPage() {
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
                Caso de uso — Consultores
              </span>

              <h1 className="mt-5 text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
                Cómo los consultores usan Dilo para calificar proyectos antes de la primera reunión
              </h1>

              <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Un consultor que recibe 10 solicitudes por semana no puede hacer 10 reuniones de discovery. Con Dilo,
                no tiene que hacerlas.
              </p>

              <div className="dilo-prose dilo-prose--blog mt-10 border-t border-border-subtle pt-10">

                {/* Historia concreta */}
                <p>
                  Un consultor de ERP recibe 8 solicitudes de proyecto por semana. Antes del cambio: agenda una
                  reunión de 45 minutos con cada prospecto para entender el contexto, el presupuesto, los módulos
                  que necesitan y si el proyecto tiene viabilidad real. De esas 8 reuniones, 5 terminan en "lo
                  pensamos y te avisamos".
                </p>
                <p>
                  Después del cambio: cuando alguien pregunta por una cotización, el consultor responde con un link.
                  El prospecto completa un flow de Dilo en 3 minutos — tipo de empresa, módulos requeridos,
                  presupuesto en rangos, plazo, si tienen sistema actual y qué quieren reemplazar. El consultor
                  recibe el briefing completo antes de agendar cualquier reunión.
                </p>
                <p>
                  Resultado: solo agenda reunión con los 3 o 4 que valen su tiempo. Los demás reciben una respuesta
                  honesta por escrito. Las reuniones que sí ocurren empiezan directamente en la propuesta.
                </p>

                <h2>El problema que resuelve</h2>
                <p>
                  El discovery no estructurado tiene tres costos que la mayoría de los consultores no calculan:
                </p>
                <ul>
                  <li>
                    <strong>Tiempo en leads no calificados:</strong> sin pre-filtro, el consultor trata igual a un
                    prospecto con presupuesto real que a uno que solo está "cotizando por curiosidad".
                  </li>
                  <li>
                    <strong>Reuniones mal preparadas:</strong> cuando la reunión de discovery empieza desde cero,
                    el consultor improvisa. La propuesta que sale de ahí suele tener más supuestos que datos reales.
                  </li>
                  <li>
                    <strong>Cuello de botella de agenda:</strong> el calendario del consultor se llena de
                    exploratorias que no avanzan, dejando menos espacio para los proyectos que sí están cerrando.
                  </li>
                </ul>

                <h2>Cómo funciona el flow de discovery</h2>
                <p>
                  El consultor entra a Dilo y describe en texto lo que necesita saber del cliente potencial. Por
                  ejemplo:
                </p>
                <blockquote>
                  <p>
                    "Quiero pre-calificar clientes para consultoría de ERP. Necesito saber: tamaño de empresa,
                    módulos que necesitan, presupuesto disponible, si tienen sistema actual y cuándo quieren
                    empezar."
                  </p>
                </blockquote>
                <p>
                  Dilo genera el flow conversacional completo: preguntas ordenadas, tipos de campo apropiados
                  (selección para presupuesto y módulos, texto para contexto adicional) y lógica básica. El
                  consultor revisa, ajusta si hace falta, y obtiene un link listo para compartir.
                </p>
                <p>
                  Cuando el prospecto termina, el consultor recibe un resumen estructurado con todas las respuestas
                  y un score que indica si el lead es prioritario, secundario o no calificado — sin tener que leer
                  campo por campo.
                </p>

                <h2>Qué preguntas incluir en un flow de discovery</h2>
                <p>Cinco dimensiones que cubren el 90% de lo que necesitas saber antes de cotizar:</p>
                <ul>
                  <li><strong>Tipo de proyecto:</strong> qué servicio o solución necesitan exactamente</li>
                  <li><strong>Presupuesto:</strong> en rangos — nunca campo numérico libre</li>
                  <li><strong>Plazo:</strong> cuándo quieren empezar y en cuánto tiempo necesitan el resultado</li>
                  <li><strong>Situación actual:</strong> qué tienen hoy, qué quieren reemplazar o mejorar</li>
                  <li><strong>Objetivo principal:</strong> qué resultado específico esperan lograr</li>
                </ul>
                <p>
                  Con estas cinco respuestas estructuradas, un consultor puede preparar una propuesta real — no un
                  documento genérico con supuestos.
                </p>

                <h2>Cómo se comparte el flow</h2>
                <p>
                  El link del flow va donde están los prospectos. Las formas más efectivas que usan los consultores
                  que ya usan Dilo:
                </p>
                <ul>
                  <li>
                    <strong>Respuesta automática a consultas de precio:</strong> cuando alguien pregunta "¿cuánto
                    cobras por X?", la respuesta incluye el link: "Para prepararte una propuesta precisa, necesito
                    entender tu proyecto — te toma 3 minutos: [link]".
                  </li>
                  <li>
                    <strong>En la firma del email:</strong> "¿Tienes un proyecto en mente? Cuéntame aquí antes de
                    agendar."
                  </li>
                  <li>
                    <strong>En la bio de LinkedIn o Instagram:</strong> como primer paso del funnel antes de
                    cualquier llamada.
                  </li>
                </ul>

                <h2>El resultado concreto</h2>
                <p>
                  Un consultor que recibe 10 solicitudes por semana y antes tenía 10 reuniones exploratorias pasa a
                  tener 3 reuniones reales. Las otras 7 se resuelven con el flow: o el lead no estaba calificado
                  (respuesta honesta por escrito) o el briefing era suficiente para enviar una propuesta sin
                  reunión.
                </p>
                <p>
                  El tiempo liberado no solo se mide en horas — se mide en capacidad para tomar más proyectos o
                  en mejor trabajo en los que ya tiene.
                </p>

                {/* CTA */}
                <div className="not-prose mt-10 flex flex-col items-center gap-3 rounded-2xl border border-[rgba(124,58,237,0.15)] bg-dilo-50/60 px-6 py-8 text-center dark:border-[rgba(124,58,237,0.25)] dark:bg-[rgba(124,58,237,0.08)]">
                  <p className="text-base font-semibold text-foreground">
                    Crea tu flow de discovery en menos de 2 minutos
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Describe lo que necesitas saber de tus clientes y Dilo genera el flow completo. Gratis para
                    empezar.
                  </p>
                  <Link
                    href="/sign-up"
                    className="dilo-mdx-cta mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-dilo-500/30 ring-1 ring-white/15 transition hover:opacity-[0.97] hover:shadow-xl hover:shadow-dilo-500/35 active:scale-[0.99]"
                  >
                    Crear mi flow de discovery gratis
                  </Link>
                </div>

                {/* FAQ */}
                <h2>Preguntas frecuentes</h2>

                <h3>¿Cómo usan Dilo los consultores para hacer discovery?</h3>
                <p>
                  El consultor crea un flow describiendo qué información necesita del cliente potencial: tipo de
                  proyecto, presupuesto en rangos, plazo, situación actual. Comparte el link antes de la primera
                  reunión. El cliente responde en 3 minutos y el consultor recibe un briefing estructurado listo
                  para cotizar.
                </p>

                <h3>¿Cuánto tiempo ahorra un consultor usando flows de Dilo?</h3>
                <p>
                  Un consultor con 10 solicitudes por semana y reuniones de discovery de 30-45 minutos puede
                  eliminar entre 5 y 7 horas semanales de reuniones exploratorias. Las que sí ocurren empiezan
                  directamente en la propuesta.
                </p>

                <h3>¿Qué preguntas debe incluir un flow de discovery para consultores?</h3>
                <p>
                  Las más efectivas: tipo de proyecto, presupuesto en rangos, plazo de inicio, situación actual del
                  cliente y objetivo principal. Con estas cinco dimensiones se puede pre-calificar el lead y
                  preparar una propuesta real sin reuniones previas.
                </p>

              </div>
            </div>
          </div>
        </article>
      </div>
    </BlogShell>
  )
}
