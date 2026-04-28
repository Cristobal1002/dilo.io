import type { FlowTemplateDefinition } from './types'
import { TB } from './branch-presets'
import { baseCompletion, contactSteps, esTone, opts, scoring, st } from './helpers'

export const erpTemplate: FlowTemplateDefinition = {
  id: 'pre-diagnostico-erp',
  title: 'Pre-diagnóstico ERP',
  subtitle: 'Contexto, alcance, capacidad y presupuesto — listo para demo seria.',
  audience: 'Implementadores de software y consultoras ERP',
  scoringObjective:
    'Priorizar proyectos con presupuesto alineado al alcance, sponsor interno, baja resistencia al cambio y dolor operativo claro; detectar riesgo por ERP fallido previo o ausencia de IT.',
  flow: {
    name: 'Pre-diagnóstico ERP',
    description:
      'Formulario orientado a consultores ERP (5–8 min): contexto empresarial, situación actual, alcance, capacidad organizacional y decisión/presupuesto. Incluye contacto y ramas si hubo ERP fallido.',
    settings: {
      language: 'es',
      completion_message: baseCompletion,
      transition_style: 'ai',
      tone: esTone,
      chat_intro:
        'Te tomará unos 5–8 minutos. Primero tus datos de contacto y luego preguntas concretas sobre tu operación y proyecto ERP. Puedes guardar y salir si tu navegador lo permite.',
    },
    scoring_criteria: scoring(
      'Presupuesto medio-alto o aprobado en curso, sponsor o líder definido, varios módulos críticos, plazo de go-live en menos de 12 meses y dolor operativo articulado.',
      'Interés real pero presupuesto indefinido, IT débil o resistencia al cambio sin plan, o alcance todavía difuso.',
      'Sin presupuesto ni sponsor, resistencia alta sin líder, o expectativa desalineada con la complejidad típica de un ERP.',
    ),
  },
  steps: [
    ...contactSteps(),
    st(4, 'select', '¿En qué sector opera principalmente su empresa?', 'sector', {
      ...TB.erEmp,
      options: opts([
        { label: 'Manufactura', value: 'manufactura' },
        { label: 'Comercio / retail', value: 'comercio' },
        { label: 'Servicios', value: 'servicios' },
        { label: 'Construcción', value: 'construccion' },
        { label: 'Salud', value: 'salud' },
        { label: 'Educación', value: 'educacion' },
        { label: 'Otro', value: 'otro' },
      ]),
    }),
    st(5, 'select', '¿Cuántos empleados tienen hoy?', 'empleados', {
      ...TB.erEmp,
      options: opts([
        { label: '1–15', value: '1_15' },
        { label: '16–50', value: '16_50' },
        { label: '51–150', value: '51_150' },
        { label: 'Más de 150', value: '150_mas' },
      ]),
    }),
    st(6, 'select', '¿Cuántas sedes, bodegas o puntos de venta gestionan?', 'sedes', {
      ...TB.erEmp,
      options: opts([
        { label: '1', value: '1' },
        { label: '2–3', value: '2_3' },
        { label: '4–10', value: '4_10' },
        { label: 'Más de 10', value: '10_mas' },
      ]),
    }),
    st(7, 'yes_no', '¿Operan en más de un país?', 'multi_pais', {
      ...TB.erEmp,
      hint: 'Importa si necesitan multi-moneda o varias razones sociales.',
    }),
    st(8, 'select', '¿Qué usan hoy para gestionar el negocio?', 'sistema_actual', {
      ...TB.erSist,
      options: opts([
        { label: 'Excel / correo / hojas de cálculo', value: 'excel' },
        { label: 'Sistema hecho a medida', value: 'medida' },
        { label: 'Otro ERP', value: 'otro_erp' },
        { label: 'Módulos aislados por área', value: 'aislados' },
        { label: 'Nada estructurado', value: 'nada' },
      ]),
    }),
    st(9, 'multi_select', '¿Cuál es el problema principal que quieren resolver?', 'problema_principal', {
      ...TB.erSist,
      options: opts([
        { label: 'Información desconectada entre áreas', value: 'desconexion' },
        { label: 'Demora en reportes o cierres', value: 'reportes' },
        { label: 'Errores en inventario o facturación', value: 'inventario_fact' },
        { label: 'Cumplimiento normativo (ej. facturación electrónica)', value: 'normativa' },
        { label: 'No escalan sin contratar más personal', value: 'escala' },
        { label: 'Otro', value: 'otro' },
      ]),
    }),
    st(10, 'select', '¿Han intentado implementar un ERP antes?', 'erp_prev', {
      ...TB.erSist,
      options: opts([
        { label: 'No, nunca', value: 'no_nunca' },
        { label: 'Sí, y no funcionó', value: 'no_funciono' },
        { label: 'Sí, pero lo abandonaron', value: 'abandonamos' },
      ]),
    }),
    st(11, 'long_text', '¿Qué pasó con la implementación o el intento anterior de ERP?', 'erp_fallo_detalle', {
      ...TB.erFallo,
      hint: 'Presupuesto, resistencia al cambio, implementador, producto… Ej.: inventario multi-bodega y el proyecto quedó a mitad.',
      placeholder: 'Cuéntalo en 2–4 frases.',
      conditions: [
        { if: 'erp_prev', equals: 'no_nunca', skip_to: 12 },
        { if: 'erp_prev', equals: 'abandonamos', skip_to: 12 },
      ],
    }),
    st(12, 'multi_select', '¿Qué módulos necesitan?', 'modulos', {
      ...TB.erMod,
      options: opts([
        { label: 'Contabilidad y finanzas', value: 'conta' },
        { label: 'Facturación electrónica (DIAN)', value: 'dian' },
        { label: 'Inventario y bodegas', value: 'inventario' },
        { label: 'Compras y proveedores', value: 'compras' },
        { label: 'Ventas y cartera', value: 'ventas' },
        { label: 'Nómina y personal', value: 'nomina' },
        { label: 'Producción / manufactura', value: 'produccion' },
        { label: 'CRM y clientes', value: 'crm' },
        { label: 'Proyectos y costos', value: 'proyectos' },
        { label: 'Otro', value: 'otro' },
      ]),
    }),
    st(13, 'multi_select', '¿Necesitan integración con herramientas externas?', 'integraciones', {
      ...TB.erMod,
      options: opts([
        { label: 'Tienda en línea / e-commerce', value: 'ecom' },
        { label: 'POS / punto de venta', value: 'pos' },
        { label: 'Banco / PSE', value: 'banco' },
        { label: 'Pasarela de pagos', value: 'pagos' },
        { label: 'Ninguna por ahora', value: 'ninguna' },
      ]),
    }),
    st(14, 'select', '¿Cuántos usuarios usarían el sistema casi todos los días?', 'usuarios_diarios', {
      ...TB.erMod,
      options: opts([
        { label: '1–5', value: '1_5' },
        { label: '6–15', value: '6_15' },
        { label: '16–30', value: '16_30' },
        { label: 'Más de 30', value: '30_mas' },
      ]),
    }),
    st(15, 'select', '¿Necesitan acceso móvil en campo?', 'movil_campo', {
      ...TB.erOrg,
      options: opts([
        { label: 'Sí', value: 'si' },
        { label: 'No', value: 'no' },
        { label: 'Aún no lo sabemos', value: 'no_se' },
      ]),
    }),
    st(16, 'select', '¿Tienen área o persona de IT interna?', 'area_it', {
      ...TB.erOrg,
      options: opts([
        { label: 'Sí, área propia', value: 'area' },
        { label: 'Soporte externo', value: 'externo' },
        { label: 'No tenemos nadie dedicado', value: 'nadie' },
      ]),
    }),
    st(17, 'select', '¿Hay líder interno para el proyecto ERP?', 'lider_proyecto', {
      ...TB.erOrg,
      options: opts([
        { label: 'Sí, ya hay nombre', value: 'si_nombre' },
        { label: 'Lo definiremos', value: 'definir' },
        { label: 'Nadie asignado aún', value: 'nadie' },
      ]),
    }),
    st(18, 'select', '¿El equipo está dispuesto a cambiar procesos?', 'cambio_procesos', {
      ...TB.erOrg,
      options: opts([
        { label: 'Sí, totalmente', value: 'si' },
        { label: 'Hay resistencia pero avanzaremos', value: 'resistencia' },
        { label: 'Será difícil aceptar cambios', value: 'dificil' },
      ]),
    }),
    st(19, 'select', '¿Presupuesto disponible para el proyecto (orientativo, COP)?', 'presupuesto_cop', {
      ...TB.erCom,
      options: opts([
        { label: 'Menos de $10M', value: 'lt10' },
        { label: '$10M – $30M', value: '10_30' },
        { label: '$30M – $60M', value: '30_60' },
        { label: '$60M – $120M', value: '60_120' },
        { label: 'Más de $120M', value: '120_mas' },
        { label: 'Aún sin definir', value: 'indefinido' },
      ]),
    }),
    st(20, 'select', '¿Ese presupuesto está aprobado por gerencia?', 'presupuesto_aprobado', {
      ...TB.erCom,
      options: opts([
        { label: 'Sí, aprobado', value: 'aprobado' },
        { label: 'En proceso', value: 'proceso' },
        { label: 'Aún no lo hemos hablado', value: 'no_hablado' },
      ]),
    }),
    st(21, 'select', '¿Quién decide la contratación del ERP?', 'decision_compra', {
      ...TB.erCom,
      options: opts([
        { label: 'Gerente general / CEO', value: 'ceo' },
        { label: 'Gerente financiero / CFO', value: 'cfo' },
        { label: 'Junta directiva', value: 'junta' },
        { label: 'Yo mismo / yo misma', value: 'yo' },
      ]),
    }),
    st(22, 'select', '¿Cuándo quieren tener el sistema funcionando?', 'go_live', {
      ...TB.erCom,
      options: opts([
        { label: 'En los próximos 2 meses', value: '2m' },
        { label: 'En 3–6 meses', value: '3_6m' },
        { label: 'En 6–12 meses', value: '6_12m' },
        { label: 'Sin fecha definida', value: 'sin_fecha' },
      ]),
    }),
  ],
}
