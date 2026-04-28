import type { FlowTemplateDefinition } from './types'
import { TB } from './branch-presets'
import { baseCompletion, contactSteps, esTone, opts, scoring, st } from './helpers'

export const organizacionesTemplate: FlowTemplateDefinition = {
  id: 'captura-datos-organizaciones',
  title: 'Captura de datos para organizaciones',
  subtitle: 'Deja el caos de WhatsApp y Excel: tipo de org, canales y presupuesto para herramientas.',
  audience: 'ONGs, conjuntos, clubes, colegios y coordinadores',
  scoringObjective:
    'Identificar organizaciones con dolor real de datos recurrentes, tamaño de base, disposición a digitalizar y presupuesto mensual razonable para herramientas.',
  flow: {
    name: 'Captura de datos para organizaciones',
    description:
      'Diagnóstico para coordinadores (5–7 min): tipo de organización, tamaño, canales, frecuencia de captura y presupuesto. Incluye contacto.',
    settings: {
      language: 'es',
      completion_message: baseCompletion,
      transition_style: 'ai',
      tone: 'Cercano, inclusivo y claro; sin tecnicismos innecesarios.',
      chat_intro:
        'Si gestionas miembros o inscripciones, este formulario ayuda a dimensionar cómo capturáis datos hoy y qué mejorar. Empieza con tu contacto.',
    },
    scoring_criteria: scoring(
      'Dolor claro (dispersión, demoras), tamaño conocido, frecuencia de captura y apertura a ordenar procesos; presupuesto >0.',
      'Problema vago o canales muy dispersos; requiere taller o acompañamiento inicial.',
      'Sin presupuesto para herramientas o sin voluntad de cambiar hábitos.',
    ),
  },
  steps: [
    ...contactSteps(),
    st(4, 'select', '¿Qué tipo de organización son?', 'tipo_org', {
      ...TB.orPerf,
      options: opts([
        { label: 'Iglesia o comunidad religiosa', value: 'iglesia' },
        { label: 'Conjunto / comunidad de vecinos', value: 'conjunto' },
        { label: 'Club deportivo o cultural', value: 'club' },
        { label: 'ONG o fundación', value: 'ong' },
        { label: 'Colegio o centro educativo', value: 'edu' },
        { label: 'Gremio o asociación', value: 'gremio' },
        { label: 'Otro', value: 'otro' },
      ]),
    }),
    st(5, 'select', '¿Cuántos miembros o personas activas gestionan?', 'tamano', {
      ...TB.orPerf,
      options: opts([
        { label: 'Menos de 50', value: 'lt50' },
        { label: '50–200', value: '50_200' },
        { label: '200–500', value: '200_500' },
        { label: 'Más de 500', value: '500_mas' },
      ]),
    }),
    st(6, 'select', '¿Tienen sede física o son 100% virtuales?', 'sede', {
      ...TB.orPerf,
      options: opts([
        { label: 'Sede física', value: 'fisica' },
        { label: 'Virtual', value: 'virtual' },
        { label: 'Mixto', value: 'mixto' },
      ]),
    }),
    st(7, 'multi_select', '¿Cómo se comunican hoy con miembros?', 'canales', {
      ...TB.orOps,
      options: opts([
        { label: 'WhatsApp / Telegram', value: 'chat' },
        { label: 'Correo', value: 'email' },
        { label: 'Redes sociales', value: 'redes' },
        { label: 'Web', value: 'web' },
        { label: 'Presencial en eventos', value: 'presencial' },
        { label: 'Sin canal claro', value: 'caos' },
      ]),
    }),
    st(8, 'select', '¿Qué usan para el registro de miembros?', 'registro_herramienta', {
      ...TB.orOps,
      options: opts([
        { label: 'Excel / Sheets', value: 'excel' },
        { label: 'Sistema propio', value: 'propio' },
        { label: 'Software especializado', value: 'saas' },
        { label: 'No hay registro ordenado', value: 'no' },
      ]),
    }),
    st(9, 'multi_select', '¿Para qué capturan datos con frecuencia?', 'usos_datos', {
      ...TB.orOps,
      options: opts([
        { label: 'Inscripciones a eventos', value: 'eventos' },
        { label: 'Nuevos miembros', value: 'altas' },
        { label: 'Encuestas', value: 'encuestas' },
        { label: 'Pagos / cuotas', value: 'pagos' },
        { label: 'Onboarding', value: 'onboarding' },
        { label: 'Actualización de datos', value: 'update' },
        { label: 'Otro', value: 'otro' },
      ]),
    }),
    st(10, 'long_text', '¿Cuál es el mayor problema con la gestión de información hoy?', 'dolor', {
      ...TB.orOps,
      hint: 'Ej. “todo vive en 3 grupos de WhatsApp y perdemos pagos”.',
    }),
    st(11, 'select', '¿Cada cuánto necesitan recopilar información?', 'frecuencia', {
      ...TB.orOps,
      options: opts([
        { label: 'Casi siempre', value: 'continuo' },
        { label: 'Mensual', value: 'mensual' },
        { label: 'Varias veces al año', value: 'varias' },
        { label: 'Solo en eventos', value: 'eventos' },
      ]),
    }),
    st(12, 'yes_no', '¿Hay alguien responsable de tecnología o comunicaciones?', 'responsable_tech', { ...TB.orOps }),
    st(13, 'select', '¿Cuánto pueden invertir al mes en herramientas (USD)?', 'presupuesto_mensual_usd', {
      ...TB.orInv,
      options: opts([
        { label: 'Nada por ahora', value: 'cero' },
        { label: 'Menos de USD 50', value: 'lt50' },
        { label: 'USD 50–150', value: '50_150' },
        { label: 'Más de USD 150', value: '150_mas' },
      ]),
    }),
    st(14, 'select', '¿Cuándo les gustaría tenerlo funcionando?', 'plazo_herramienta', {
      ...TB.orInv,
      options: opts([
        { label: 'Menos de 1 mes', value: '1m' },
        { label: '1–3 meses', value: '1_3m' },
        { label: 'Más flexible', value: 'flex' },
      ]),
    }),
  ],
}
