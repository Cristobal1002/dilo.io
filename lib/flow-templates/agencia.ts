import type { FlowTemplateDefinition } from './types'
import { TB } from './branch-presets'
import { baseCompletion, contactSteps, esTone, opts, scoring, st } from './helpers'

export const agenciaTemplate: FlowTemplateDefinition = {
  id: 'discovery-agencia',
  title: 'Discovery de agencia',
  subtitle: 'Proyecto, contenido, técnico y cierre — sin sorpresas en la cotización.',
  audience: 'Agencias de marketing, diseño o desarrollo',
  scoringObjective:
    'Evaluar encaje comercial: claridad de objetivo, madurez de marca y contenido, integraciones, presupuesto vs alcance y señales de riesgo (sin contenido, mala experiencia previa).',
  flow: {
    name: 'Discovery de agencia',
    description:
      'Briefing pre-cotización (6–9 min): qué necesitan, objetivos, contexto de marca y contenido, aspectos técnicos si aplica web/e-commerce, y cierre comercial. Incluye contacto.',
    settings: {
      language: 'es',
      completion_message: baseCompletion,
      transition_style: 'ai',
      tone: esTone,
      chat_intro:
        'En 6–9 minutos dejamos listo un brief serio para cotizar sin idas y vueltas. Empieza con tus datos de contacto.',
    },
    scoring_criteria: scoring(
      'Objetivo claro, identidad y contenido razonables para el alcance, integraciones acotadas, presupuesto alineado y plazo realista.',
      'Proyecto interesente pero falta contenido o identidad, o presupuesto ajustado vs alcance; requiere ajustar scope o fasear.',
      'Expectativa desalineada, sin presupuesto o sin claridad mínima para cotizar responsablemente.',
    ),
  },
  steps: [
    ...contactSteps(),
    st(4, 'multi_select', '¿Qué necesitan? (puedes marcar varias)', 'necesidades', {
      ...TB.agProyecto,
      options: opts([
        { label: 'Sitio web', value: 'web' },
        { label: 'Tienda en línea', value: 'ecom' },
        { label: 'Branding e identidad', value: 'branding' },
        { label: 'SEO / posicionamiento', value: 'seo' },
        { label: 'Pauta digital (Google/Meta)', value: 'pauta' },
        { label: 'Redes sociales', value: 'social' },
        { label: 'Landing / campaña puntual', value: 'landing' },
        { label: 'Otro', value: 'otro' },
      ]),
    }),
    st(5, 'select', '¿Cuál es el objetivo principal de este proyecto?', 'objetivo_principal', {
      ...TB.agProyecto,
      options: opts([
        { label: 'Generar más ventas', value: 'ventas' },
        { label: 'Presencia profesional', value: 'presencia' },
        { label: 'Conseguir leads', value: 'leads' },
        { label: 'Lanzar producto nuevo', value: 'lanzar' },
        { label: 'Rediseñar lo existente', value: 'rediseno' },
      ]),
    }),
    st(6, 'select', '¿Qué tan listo está lo que tienen hoy?', 'estado_base', {
      ...TB.agProyecto,
      options: opts([
        { label: 'Tenemos sitio/marca pero necesitamos mejoras', value: 'mejoras' },
        { label: 'Está muy desactualizado', value: 'desactualizado' },
        { label: 'Empezamos desde cero', value: 'cero' },
      ]),
    }),
    st(7, 'text', '¿En qué industria o sector están?', 'industria', {
      ...TB.agProyecto,
      placeholder: 'Ej. SaaS B2B, retail de moda, clínicas…',
    }),
    st(8, 'long_text', '¿Quién es su audiencia objetivo?', 'audiencia', {
      ...TB.agProyecto,
      hint: 'Ej. “PYMEs de servicios en Bogotá” o “personas 25–40 que compran skincare online”.',
      placeholder: 'Descríbela en 1–3 frases.',
    }),
    st(9, 'select', '¿Cómo está su identidad visual?', 'identidad_visual', {
      ...TB.agMarca,
      options: opts([
        { label: 'Logo + colores + tipografía listos', value: 'completa' },
        { label: 'Solo logo', value: 'solo_logo' },
        { label: 'Hay que definir todo', value: 'desde_cero' },
      ]),
    }),
    st(10, 'select', '¿Tienen textos listos para el proyecto?', 'textos', {
      ...TB.agMarca,
      options: opts([
        { label: 'Sí, listos', value: 'listos' },
        { label: 'Borrador, necesita ajustes', value: 'borrador' },
        { label: 'No, necesitan apoyo', value: 'no_apoyo' },
      ]),
    }),
    st(11, 'select', '¿Tienen fotografía o imágenes listas?', 'fotos', {
      ...TB.agMarca,
      options: opts([
        { label: 'Banco propio', value: 'propio' },
        { label: 'Usaremos stock', value: 'stock' },
        { label: 'Necesitamos sesión / producción', value: 'sesion' },
      ]),
    }),
    st(12, 'select', '¿Tienen hosting y dominio propio?', 'hosting', {
      ...TB.agTec,
      options: opts([
        { label: 'Sí', value: 'si' },
        { label: 'No, necesitan ayuda', value: 'no_ayuda' },
        { label: 'No sabemos qué es eso', value: 'no_se' },
      ]),
    }),
    st(13, 'multi_select', '¿Deben integrar el sitio con alguna herramienta?', 'integraciones', {
      ...TB.agTec,
      options: opts([
        { label: 'CRM', value: 'crm' },
        { label: 'Reservas / citas', value: 'reservas' },
        { label: 'E-commerce / catálogo', value: 'ecom_int' },
        { label: 'Pagos en línea', value: 'pagos' },
        { label: 'Formularios / automatización', value: 'forms' },
        { label: 'Ninguna por ahora', value: 'ninguna' },
      ]),
    }),
    st(14, 'select', '¿Quién actualizará el contenido después del lanzamiento?', 'quien_actualiza', {
      ...TB.agTec,
      options: opts([
        { label: 'Nosotros — debe ser fácil de editar', value: 'cliente' },
        { label: 'La agencia', value: 'agencia' },
        { label: 'Aún no lo sabemos', value: 'no_se' },
      ]),
    }),
    st(15, 'select', '¿Qué presupuesto orientan para este proyecto? (COP, aprox.)', 'presupuesto', {
      ...TB.agCom,
      options: opts([
        { label: 'Hasta ~$15M', value: 'entrada' },
        { label: '$15M – $40M', value: 'medio' },
        { label: '$40M – $100M', value: 'alto' },
        { label: 'Más de ~$100M o retainer', value: 'premium' },
        { label: 'Por definir con la agencia', value: 'por_definir' },
      ]),
    }),
    st(16, 'select', '¿Cuándo necesitan el resultado listo?', 'plazo', {
      ...TB.agCom,
      options: opts([
        { label: 'Menos de 4 semanas', value: '4s' },
        { label: '1–3 meses', value: '1_3m' },
        { label: '3–6 meses', value: '3_6m' },
        { label: 'Sin fecha definida', value: 'sin_fecha' },
      ]),
    }),
    st(17, 'select', '¿Ese presupuesto ya está aprobado?', 'presup_aprobado', {
      ...TB.agCom,
      options: opts([
        { label: 'Sí', value: 'si' },
        { label: 'En proceso', value: 'proceso' },
        { label: 'Aún no lo hemos hablado', value: 'no' },
      ]),
    }),
    st(18, 'select', '¿Han trabajado con otra agencia similar antes?', 'agencia_prev', {
      ...TB.agCom,
      options: opts([
        { label: 'No, es la primera vez', value: 'primera' },
        { label: 'Sí, y fue bien', value: 'bien' },
        { label: 'Sí, pero no funcionó', value: 'mal' },
      ]),
    }),
    st(19, 'long_text', '¿Qué salió mal con la agencia anterior? (breve)', 'agencia_malo_detalle', {
      ...TB.agExp,
      hint: 'Plazos, calidad, comunicación, alcance… Solo aplica si la experiencia previa no fue buena.',
      conditions: [
        { if: 'agencia_prev', equals: 'primera', skip_to: 20 },
        { if: 'agencia_prev', equals: 'bien', skip_to: 20 },
      ],
    }),
    st(20, 'rating', '¿Qué tan urgente sientes el proyecto? (1 = poco, 5 = muy)', 'urgencia_rating', {
      ...TB.agFin,
      required: false,
    }),
  ],
}
