import type { FlowTemplateDefinition } from './types'
import { TB } from './branch-presets'
import { baseCompletion, contactSteps, esTone, opts, scoring, st } from './helpers'

export const legalTemplate: FlowTemplateDefinition = {
  id: 'pre-diagnostico-legal',
  title: 'Pre-diagnóstico legal',
  subtitle: 'Clasificación, hechos, documentación y expectativas antes de agendar.',
  audience: 'Estudios jurídicos y asesorías',
  scoringObjective:
    'Clasificar área del derecho, urgencia, documentación y expectativas realistas; priorizar consultas con plazos reales y señales de litigiosidad.',
  flow: {
    name: 'Pre-diagnóstico legal',
    description:
      'Formulario inicial confidencial (6–9 min). No sustituye asesoría legal. Incluye contacto y advertencia en el saludo.',
    settings: {
      language: 'es',
      completion_message:
        'Gracias. Revisaremos tu mensaje con confidencialidad y te indicaremos el siguiente paso (incluida la posibilidad de no ser el encaje adecuado).',
      transition_style: 'ai',
      tone: 'Sereno, preciso y respetuoso; sin prometer resultados judiciales.',
      chat_intro:
        'Este formulario no es consulta legal ni crea relación abogado–cliente: sirve para orientar una primera reunión. Indica tus datos de contacto y resume tu situación.',
    },
    scoring_criteria: scoring(
      'Caso acotado, urgencia coherente, antecedentes mencionados y expectativa razonable; presupuesto o disposición a hablarlo.',
      'Hechos poco claros o expectativa difícil; conviene llamada de aclaración antes de comprometer honorarios.',
      'Fuera de práctica, datos insuficientes o conflicto de interés probable.',
    ),
  },
  steps: [
    ...contactSteps(),
    st(4, 'select', '¿Persona natural o empresa?', 'tipo_cliente', {
      ...TB.leCla,
      options: opts([
        { label: 'Persona natural', value: 'natural' },
        { label: 'Empresa', value: 'empresa' },
      ]),
    }),
    st(5, 'select', '¿Qué área describe mejor tu situación?', 'area_derecho', {
      ...TB.leCla,
      options: opts([
        { label: 'Contratos / comercial', value: 'contratos' },
        { label: 'Laboral', value: 'laboral' },
        { label: 'Constitución o cierre de empresa', value: 'societario' },
        { label: 'PI y marcas', value: 'pi' },
        { label: 'Inmobiliario', value: 'inmobiliario' },
        { label: 'Litigios / demandas', value: 'litigio' },
        { label: 'Familia y sucesiones', value: 'familia' },
        { label: 'Tributario / fiscal', value: 'tributario' },
        { label: 'No sé clasificarlo', value: 'no_se' },
      ]),
    }),
    st(6, 'long_text', 'Describe tu situación con tus palabras', 'hechos', {
      ...TB.leHechos,
      hint: 'Como se lo contarías a un amigo, sin tecnicismos. Evita datos personales innecesarios.',
      placeholder: '50–300 palabras aprox.',
    }),
    st(7, 'text', '¿Cuándo ocurrió o cuándo empieza? (fecha o mes/año)', 'cuando', { ...TB.leHechos }),
    st(8, 'select', '¿Hay urgencia con fecha límite?', 'urgencia', {
      ...TB.leHechos,
      options: opts([
        { label: 'Sí — demanda, vencimiento o notificación', value: 'si' },
        { label: 'Media', value: 'media' },
        { label: 'No hay urgencia inmediata', value: 'no' },
      ]),
    }),
    st(9, 'multi_select', '¿Quiénes están involucrados?', 'partes', {
      ...TB.leProc,
      options: opts([
        { label: 'Empleador', value: 'empleador' },
        { label: 'Ex socio', value: 'exsocio' },
        { label: 'Proveedor', value: 'proveedor' },
        { label: 'Cliente', value: 'cliente' },
        { label: 'Familiar', value: 'familiar' },
        { label: 'Entidad del Estado', value: 'estado' },
        { label: 'Otra empresa', value: 'empresa_tercera' },
        { label: 'Otro', value: 'otro' },
      ]),
    }),
    st(10, 'select', '¿Hay contrato o documento firmado relacionado?', 'contrato_doc', {
      ...TB.leProc,
      options: opts([
        { label: 'Sí', value: 'si' },
        { label: 'No', value: 'no' },
        { label: 'Sí pero verbal / informal', value: 'verbal' },
      ]),
    }),
    st(11, 'select', '¿Comunicación formal entre las partes?', 'comunicacion_formal', {
      ...TB.leProc,
      options: opts([
        { label: 'Cartas, correos o demanda', value: 'formal' },
        { label: 'Solo verbal', value: 'verbal' },
        { label: 'Notificación de entidad', value: 'notif' },
        { label: 'Nada aún', value: 'nada' },
      ]),
    }),
    st(12, 'select', '¿Procesos judiciales activos relacionados?', 'proceso_activo', {
      ...TB.leProc,
      options: opts([
        { label: 'Sí, activo', value: 'si' },
        { label: 'No', value: 'no' },
        { label: 'Hubo y se cerró', value: 'cerrado' },
      ]),
    }),
    st(13, 'select', '¿Consultaste antes con otro abogado sobre esto?', 'abogado_previo', {
      ...TB.leProc,
      options: opts([
        { label: 'No', value: 'no' },
        { label: 'Sí — segunda opinión', value: 'segunda' },
        { label: 'Sí — no hubo acuerdo', value: 'no_acuerdo' },
      ]),
    }),
    st(14, 'long_text', '¿Qué resultado concreto esperas?', 'expectativa', { ...TB.leFin }),
    st(15, 'long_text', '¿Empresa o persona específica contra quien actuar o defenderte?', 'contraparte', {
      ...TB.leFin,
      required: false,
    }),
    st(16, 'select', '¿Presupuesto definido para asesoría?', 'presupuesto_legal', {
      ...TB.leFin,
      options: opts([
        { label: 'Sí — rango definido (detalla en notas)', value: 'si' },
        { label: 'No claro aún', value: 'no' },
        { label: 'Depende del costo del proceso', value: 'depende' },
      ]),
    }),
    st(17, 'text', '¿Cuándo podrías atender una primera consulta? (días/horario)', 'disponibilidad', { ...TB.leFin }),
  ],
}
