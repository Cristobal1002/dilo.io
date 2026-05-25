import type { FlowTemplateDefinition } from './types'
import { TB } from './branch-presets'
import { baseCompletion, contactSteps, esTone, opts, scoring, st } from './helpers'

const soporte = { branch_label: 'Solicitud', branch_color: '#9C77F5' }

export const supportRequestTemplate: FlowTemplateDefinition = {
  id: 'solicitud-soporte',
  title: 'Solicitud de soporte',
  subtitle: 'Intake para casos técnicos y mejoras — crea tickets en la bandeja Soporte.',
  audience: 'Equipos de tecnología, consultoras y MSP',
  scoringObjective:
    'Clasificar urgencia y tipo de solicitud para priorizar la bandeja interna; no es scoring comercial.',
  flow: {
    name: 'Solicitud de soporte',
    description:
      'Formulario para que clientes o usuarios internos abran un caso. Al completar, aparece en Soporte del panel.',
    settings: {
      language: 'es',
      purpose: 'support',
      completion_message:
        'Recibimos tu solicitud. Te contactaremos por correo con el número de caso y los próximos pasos.',
      transition_style: 'ai',
      tone: esTone,
      chat_intro:
        'Cuéntanos qué necesitas en unos minutos. Al terminar, tu caso llegará al equipo de soporte.',
    },
    scoring_criteria: scoring(
      'Urgencia alta con impacto operativo claro o bloqueo de producción.',
      'Solicitud válida pero sin bloqueo inmediato o con información incompleta.',
      'Consulta general, duplicado o sin detalle suficiente para actuar.',
    ),
  },
  steps: [
    ...contactSteps(),
    st(4, 'text', '¿En qué empresa u organización trabajas?', 'empresa', {
      ...soporte,
      placeholder: 'Ej. Acme S.A.',
      hint: 'La empresa a la que pertenece esta solicitud (no tu nombre personal).',
    }),
    st(5, 'select', '¿Qué tipo de solicitud es?', 'tipo_solicitud', {
      ...soporte,
      options: opts([
        { label: 'Soporte técnico', value: 'soporte' },
        { label: 'Nueva funcionalidad / mejora', value: 'mejora' },
        { label: 'Consulta', value: 'consulta' },
        { label: 'Otro', value: 'otro' },
      ]),
    }),
    st(6, 'text', 'Asunto', 'asunto', {
      ...soporte,
      placeholder: 'Ej. Error al exportar reportes',
      hint: 'Una línea que resuma el problema o pedido.',
    }),
    st(7, 'long_text', 'Describe el problema o la solicitud', 'descripcion', {
      ...soporte,
      placeholder: 'Qué pasó, desde cuándo, qué esperabas…',
      hint: 'Cuanto más contexto, más rápido podemos ayudarte.',
    }),
    st(8, 'select', 'Urgencia', 'urgencia', {
      ...soporte,
      options: opts([
        { label: 'Baja — puede esperar', value: 'baja' },
        { label: 'Media — afecta trabajo pero hay alternativa', value: 'media' },
        { label: 'Alta — bloquea operación', value: 'alta' },
      ]),
    }),
  ],
}
