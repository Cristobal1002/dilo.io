import type { FlowTemplateDefinition } from './types'
import { TB } from './branch-presets'
import { opts, scoring, st } from './helpers'

const iglesiaTone =
  'Cálido, respetuoso y sin presión. Acompaña con sensibilidad espiritual; español claro, sin jerga pesada ni culpa.'

export const evangelizacionIglesiasTemplate: FlowTemplateDefinition = {
  id: 'evangelizacion-iglesias',
  title: 'Campaña evangelística (iglesia)',
  subtitle: 'Bienvenida, WhatsApp, correo con consentimiento, petición de oración y seguimiento pastoral.',
  audience: 'Iglesias y equipos de evangelización',
  scoringObjective:
    'Identificar apertura al contacto pastoral, peticiones de oración y contexto de fe (asiste / busca / no asiste).',
  flow: {
    name: '🕊️ Campaña evangelística',
    description:
      'Un espacio seguro para conocerte, orar por ti y ofrecerte acompañamiento. Tómate el tiempo que necesites; no hay respuestas incorrectas.',
    settings: {
      language: 'es',
      completion_message:
        'Gracias por compartir esto con nosotros. Vamos a estar orando por ti. 🙏',
      transition_style: 'ai',
      tone: iglesiaTone,
      chat_intro: `Hola, gracias por estar aquí.

Sabemos que a veces atravesamos momentos difíciles, cargas que pesan más de lo que sentimos poder llevar solos.

Por eso hemos dispuesto este espacio: para escucharte, conocerte y acompañarte con amor, respeto y esperanza.

Tómate el tiempo que necesites. Este es un lugar seguro para abrir tu corazón.`,
    },
    scoring_criteria: scoring(
      'Quiere contacto personal y/o comparte con claridad una petición de oración; dejó WhatsApp o correo.',
      'Prefiere no contacto por ahora o «más adelante»; aun así compartió algo de su situación.',
      'Respuestas muy breves o sin apertura al seguimiento; poco contexto para acompañar.',
    ),
  },
  steps: [
    st(1, 'text', '¿Cómo te llamas?', 'nombre_visita', {
      ...TB.igNom,
      placeholder: 'Tu nombre',
    }),
    st(2, 'phone', '¿Cuál es tu número de WhatsApp? Solo lo usaremos si nos das permiso de contactarte.', 'whatsapp_visita', {
      ...TB.igNom,
      hint: 'Incluye código de país si hace falta.',
    }),
    st(
      3,
      'email',
      '¿Cuál es tu correo electrónico? Solo lo usaremos con tu consentimiento, para enviarte algunas palabras y contenido de aliento.',
      'email_visita',
      {
        ...TB.igCor,
        placeholder: 'tu@correo.com',
      },
    ),
    st(
      4,
      'long_text',
      '¿Hay algo por lo que quisieras que oremos por ti? Puedes compartir lo que sientas; no hay respuesta incorrecta.',
      'peticion_oracion',
      {
        ...TB.igOra,
        hint: 'Puedes escribir una o varias frases, o dejarlo breve.',
      },
    ),
    st(5, 'select', '¿Te gustaría que alguien te contactara personalmente?', 'prefiere_contacto', {
      ...TB.igSeg,
      options: opts([
        { label: 'Sí, me gustaría que me contacten', value: 'si_contacto' },
        { label: 'No por ahora, solo quería compartirlo', value: 'no_ahora' },
        { label: 'Tal vez más adelante', value: 'mas_adelante' },
      ]),
    }),
    st(6, 'select', '¿Actualmente asistes a alguna iglesia o comunidad de fe?', 'situacion_iglesia', {
      ...TB.igCom,
      options: opts([
        { label: 'Sí, tengo una iglesia', value: 'tiene_iglesia' },
        { label: 'No asisto a ninguna', value: 'no_asiste' },
        { label: 'Estaba asistiendo pero ya no', value: 'dejo_asistir' },
        { label: 'Estoy buscando una comunidad', value: 'busca_comunidad' },
      ]),
    }),
  ],
}
