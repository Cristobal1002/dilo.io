import type { FlowTemplateDefinition } from './types'
import { TB } from './branch-presets'
import { baseCompletion, contactSteps, esTone, opts, scoring, st } from './helpers'

export const onboardingTemplate: FlowTemplateDefinition = {
  id: 'onboarding-cliente',
  title: 'Onboarding de cliente',
  subtitle: 'Post-venta: facturación, contactos, comunicación, accesos y pagos.',
  audience: 'Agencias, consultoras y equipos de proyecto',
  scoringObjective:
    'Completar ficha operativa: datos legales de facturación, contactos y aprobadores, canales y horarios, accesos necesarios, hitos críticos y forma de pago.',
  flow: {
    name: 'Onboarding de cliente',
    description:
      'Checklist post-firma (7–12 min): datos legales, contactos del proyecto, comunicación, accesos, fechas críticas y facturación/pagos. Incluye contacto principal.',
    settings: {
      language: 'es',
      completion_message:
        'Gracias. Con esto el equipo arma tu espacio de trabajo y el calendario de arranque. Te escribimos si falta algo.',
      transition_style: 'ai',
      tone: esTone,
      chat_intro:
        'Ya cerraron con nosotros — este formulario evita correos de ida y vuelta. Empieza con quién eres y cómo facturamos.',
    },
    scoring_criteria: scoring(
      'Datos de facturación completos, contacto y aprobadores claros, accesos listados y expectativas razonables.',
      'Falta un dato legal o un acceso clave; requiere una llamada corta de cierre.',
      'Información mínima o sin responsable; riesgo de retrasar el arranque.',
    ),
  },
  steps: [
    ...contactSteps(),
    st(4, 'select', '¿Cómo facturan?', 'tipo_facturacion', {
      ...TB.onFact,
      options: opts([
        { label: 'Persona natural', value: 'natural' },
        { label: 'Empresa / sociedad', value: 'empresa' },
      ]),
    }),
    st(5, 'text', 'NIT, RUT o identificación fiscal', 'nit_rut', {
      ...TB.onFact,
      placeholder: 'Sin puntos ni guiones si aplica',
    }),
    st(6, 'text', 'Razón social o nombre completo para factura', 'razon_social', { ...TB.onFact }),
    st(7, 'long_text', 'Dirección de facturación y ciudad', 'dir_facturacion', { ...TB.onFact }),
    st(8, 'select', '¿Cómo prefieren recibir facturas?', 'canal_factura', {
      ...TB.onFact,
      options: opts([
        { label: 'Correo electrónico', value: 'email' },
        { label: 'Portal electrónico', value: 'portal' },
        { label: 'Ambos', value: 'ambos' },
      ]),
    }),
    st(9, 'email', 'Correo para envío de facturas (si aplica)', 'email_facturacion', {
      ...TB.onFact,
      hint: 'Puede ser distinto al de contacto.',
      required: false,
    }),
    st(10, 'text', 'Cargo o rol en la empresa', 'cargo_contacto', {
      ...TB.onRoles,
      hint: 'Del contacto que ya dejaste arriba.',
    }),
    st(11, 'text', 'WhatsApp directo del proyecto', 'whatsapp', { ...TB.onRoles }),
    st(12, 'yes_no', '¿Hay otra persona que debamos incluir en copia?', 'hay_otro_contacto', { ...TB.onRoles }),
    st(13, 'long_text', 'Otra persona en copia: nombre, correo y rol', 'otro_contacto_detalle', {
      ...TB.onRoles,
      required: false,
      hint: 'Solo si marcaste que hay otra persona a incluir.',
    }),
    st(14, 'select', '¿Quién aprueba entregables y da el OK final?', 'aprobador', {
      ...TB.onRoles,
      options: opts([
        { label: 'El mismo contacto principal', value: 'mismo' },
        { label: 'Otra persona (detalla en notas)', value: 'otro' },
      ]),
    }),
    st(15, 'select', '¿Canal preferido para comunicarnos?', 'canal_comunicacion', {
      ...TB.onCom,
      options: opts([
        { label: 'WhatsApp', value: 'wa' },
        { label: 'Email', value: 'email' },
        { label: 'Videollamada', value: 'video' },
        { label: 'Slack / Teams', value: 'slack' },
      ]),
    }),
    st(16, 'long_text', 'Días y franjas disponibles para reuniones', 'horarios_reunion', { ...TB.onCom }),
    st(17, 'select', '¿Frecuencia de actualizaciones del proyecto?', 'frecuencia_updates', {
      ...TB.onCom,
      options: opts([
        { label: 'Diario', value: 'diario' },
        { label: 'Cada 2–3 días', value: '2_3' },
        { label: 'Semanal', value: 'semanal' },
        { label: 'Solo cuando hay hitos', value: 'hitos' },
      ]),
    }),
    st(18, 'multi_select', '¿Qué herramientas debemos poder usar?', 'accesos_herramientas', {
      ...TB.onAcc,
      options: opts([
        { label: 'Hosting / servidor', value: 'hosting' },
        { label: 'Dominio', value: 'dominio' },
        { label: 'Google Analytics', value: 'ga' },
        { label: 'Meta Business', value: 'meta' },
        { label: 'Google Ads', value: 'gads' },
        { label: 'CRM', value: 'crm' },
        { label: 'Correo corporativo', value: 'mail' },
        { label: 'Otro', value: 'otro' },
      ]),
    }),
    st(19, 'select', '¿Los accesos ya están listos para compartir o los creamos juntos?', 'accesos_listos', {
      ...TB.onAcc,
      options: opts([
        { label: 'Ya están listos', value: 'listos' },
        { label: 'Los creamos juntos', value: 'juntos' },
        { label: 'Parcial', value: 'parcial' },
      ]),
    }),
    st(20, 'yes_no', '¿Hay fecha límite o evento que marque el calendario?', 'hay_deadline', { ...TB.onAcc }),
    st(21, 'long_text', 'Fecha límite o evento clave (cuál y cuándo)', 'deadline_detalle', {
      ...TB.onAcc,
      required: false,
      hint: 'Solo si hay un plazo o evento que marque el calendario.',
    }),
    st(22, 'long_text', '¿Algo crítico que debamos saber antes de empezar?', 'contexto_riesgo', {
      ...TB.onAcc,
      required: false,
      hint: 'Vacaciones del equipo, dependencias técnicas, stakeholders difíciles…',
    }),
    st(23, 'select', '¿Forma de pago preferida?', 'forma_pago', {
      ...TB.onPag,
      options: opts([
        { label: 'Transferencia', value: 'transfer' },
        { label: 'Tarjeta', value: 'tarjeta' },
        { label: 'PSE', value: 'pse' },
        { label: 'Otro / lo definimos', value: 'otro' },
      ]),
    }),
    st(24, 'select', '¿Factura antes del pago o pueden pagar contra factura?', 'factura_timing', {
      ...TB.onPag,
      options: opts([
        { label: 'Factura antes', value: 'antes' },
        { label: 'Pago contra factura', value: 'contra' },
        { label: 'Lo acordamos caso a caso', value: 'mix' },
      ]),
    }),
  ],
}
