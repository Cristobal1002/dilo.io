import type { FlowTemplateDefinition } from './types'
import { TB } from './branch-presets'
import { baseCompletion, contactSteps, esTone, opts, scoring, st } from './helpers'

const skComprar = [
  { if: 'intencion', equals: 'arrendar', skip_to: 14 },
  { if: 'intencion', equals: 'vender', skip_to: 20 },
] as const

const skArrendar = [
  { if: 'intencion', equals: 'comprar', skip_to: 26 },
  { if: 'intencion', equals: 'vender', skip_to: 20 },
] as const

const skVendedor = [
  { if: 'intencion', equals: 'comprar', skip_to: 26 },
  { if: 'intencion', equals: 'arrendar', skip_to: 26 },
] as const

export const inmobiliariaTemplate: FlowTemplateDefinition = {
  id: 'calificacion-inmobiliaria',
  title: 'Calificación inmobiliaria',
  subtitle: 'Comprar, arrendar o vender: ramas distintas con la misma base de contacto.',
  audience: 'Corredores y equipos comerciales inmobiliarios',
  scoringObjective:
    'Clasificar intención, presupuesto o canon, financiación (compradores), mascotas, urgencia y señales de riesgo para priorizar llamadas y visitas.',
  flow: {
    name: 'Calificación inmobiliaria',
    description:
      'Lead inmobiliario con ramas (5–8 min): datos de contacto, intención, tipo y zona; luego preguntas específicas para compradores, arrendatarios o vendedores.',
    settings: {
      language: 'es',
      completion_message: baseCompletion,
      transition_style: 'ai',
      tone: esTone,
      chat_intro:
        'Primero tus datos de contacto. Luego unas preguntas según si buscas comprar, arrendar o vender — solo verás lo que aplica a tu caso.',
    },
    scoring_criteria: scoring(
      'Financiación avanzada o presupuesto claro, plazo corto, zona y tipología definidas; vendedores con urgencia y datos de precio.',
      'Interés real pero plazo lejano, presupuesto abierto o financiación indefinida; seguimiento en nutrición.',
      'Curiosidad sin plazo, datos contradictorios o sin intención clara de avanzar.',
    ),
  },
  steps: [
    ...contactSteps(),
    st(4, 'select', '¿Qué necesitan hacer?', 'intencion', {
      ...TB.inmIntent,
      options: opts([
        { label: 'Comprar un inmueble', value: 'comprar' },
        { label: 'Arrendar un inmueble', value: 'arrendar' },
        { label: 'Vender mi inmueble', value: 'vender' },
      ]),
    }),
    st(5, 'select', '¿Qué tipo de inmueble?', 'tipo_inmueble', {
      ...TB.inmComun,
      options: opts([
        { label: 'Apartamento', value: 'apto' },
        { label: 'Casa', value: 'casa' },
        { label: 'Local comercial', value: 'local' },
        { label: 'Oficina', value: 'oficina' },
        { label: 'Bodega', value: 'bodega' },
        { label: 'Lote / terreno', value: 'lote' },
      ]),
    }),
    st(6, 'text', '¿En qué ciudad o zona buscan o está el inmueble?', 'ciudad_zona', {
      ...TB.inmComun,
      placeholder: 'Ej. Chapinero, Medellín El Poblado…',
    }),
    st(7, 'select', '¿Qué rango de precio de compra manejan aproximadamente? (COP)', 'comprar_valor', {
      ...TB.inmCompra,
      options: opts([
        { label: 'Hasta ~$400 millones', value: 'entrada' },
        { label: '$400M – $900M', value: 'medio' },
        { label: '$900M – $1.800M', value: 'alto' },
        { label: 'Más de ~$1.800M', value: 'premium' },
        { label: 'Prefiero no decir aún', value: 'no_dice' },
      ]),
      conditions: [...skComprar],
    }),
    st(8, 'select', '¿Cuántas habitaciones como mínimo necesitan?', 'comprar_hab', {
      ...TB.inmCompra,
      options: opts([
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3 o más', value: '3_mas' },
        { label: 'Sin mínimo estricto', value: 'flex' },
      ]),
      conditions: [...skComprar],
    }),
    st(9, 'text', '¿Estrato o sector donde les gustaría comprar?', 'comprar_estrato', {
      ...TB.inmCompra,
      conditions: [...skComprar],
    }),
    st(10, 'select', '¿Qué tan importante es el parqueadero?', 'comprar_parqueadero', {
      ...TB.inmCompra,
      options: opts([
        { label: 'Indispensable', value: 'indispensable' },
        { label: 'Negociable', value: 'negociable' },
        { label: 'No', value: 'no' },
      ]),
      conditions: [...skComprar],
    }),
    st(11, 'yes_no', '¿Viven con mascotas o planean vivir con ellas en el inmueble?', 'comprar_mascotas', {
      ...TB.inmCompra,
      conditions: [...skComprar],
    }),
    st(12, 'select', '¿Cómo van con la financiación de la compra?', 'comprar_financiacion', {
      ...TB.inmCompra,
      options: opts([
        { label: 'Crédito aprobado', value: 'aprobado' },
        { label: 'En trámite', value: 'tramite' },
        { label: 'Recursos propios', value: 'propio' },
        { label: 'Aún no definido', value: 'indefinido' },
      ]),
      conditions: [...skComprar],
    }),
    st(13, 'select', '¿Para cuándo les gustaría mudarse?', 'comprar_mudanza', {
      ...TB.inmCompra,
      options: opts([
        { label: 'Menos de 2 meses', value: '2m' },
        { label: '3–6 meses', value: '3_6m' },
        { label: 'Sin fecha', value: 'sin_fecha' },
      ]),
      conditions: [...skComprar],
    }),
    st(14, 'select', '¿Qué canon mensual pueden pagar aproximadamente? (COP)', 'arrendar_canon', {
      ...TB.inmArriendo,
      options: opts([
        { label: 'Hasta ~$2 millones / mes', value: 'entrada' },
        { label: '$2M – $4M / mes', value: 'medio' },
        { label: '$4M – $8M / mes', value: 'alto' },
        { label: 'Más de ~$8M / mes', value: 'premium' },
        { label: 'Prefiero no decir', value: 'no_dice' },
      ]),
      conditions: [...skArrendar],
    }),
    st(15, 'select', '¿Cuántas habitaciones necesitan como mínimo?', 'arrendar_hab', {
      ...TB.inmArriendo,
      options: opts([
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3 o más', value: '3_mas' },
      ]),
      conditions: [...skArrendar],
    }),
    st(16, 'text', '¿En qué zona o barrio les gustaría arrendar?', 'arrendar_zona', {
      ...TB.inmArriendo,
      conditions: [...skArrendar],
    }),
    st(17, 'yes_no', '¿Necesitan que el arriendo permita mascotas?', 'arrendar_mascotas', {
      ...TB.inmArriendo,
      conditions: [...skArrendar],
    }),
    st(18, 'select', '¿Cómo describirían su situación laboral?', 'arrendar_tipo_persona', {
      ...TB.inmArriendo,
      options: opts([
        { label: 'Empleado(a)', value: 'empleado' },
        { label: 'Independiente', value: 'independiente' },
        { label: 'Empresa / sociedad', value: 'empresa' },
      ]),
      conditions: [...skArrendar],
    }),
    st(19, 'select', '¿Para cuándo necesitan entrar al inmueble?', 'arrendar_plazo', {
      ...TB.inmArriendo,
      options: opts([
        { label: 'Menos de 1 mes', value: '1m' },
        { label: '1–3 meses', value: '1_3m' },
        { label: 'Más flexible', value: 'flex' },
      ]),
      conditions: [...skArrendar],
    }),
    st(20, 'text', '¿En qué barrio o dirección aproximada está el inmueble que venden?', 'vende_dir', {
      ...TB.inmVenta,
      conditions: [...skVendedor],
    }),
    st(21, 'long_text', '¿A qué precio esperan vender (aprox.)?', 'vende_precio', {
      ...TB.inmVenta,
      hint: 'Pueden indicar un rango o lo que tengan en mente frente al mercado.',
      conditions: [...skVendedor],
    }),
    st(22, 'select', '¿Tienen hipoteca o gravamen vigente sobre el inmueble?', 'vende_hipoteca', {
      ...TB.inmVenta,
      options: opts([
        { label: 'Sí', value: 'si' },
        { label: 'No', value: 'no' },
        { label: 'No sé', value: 'no_se' },
      ]),
      conditions: [...skVendedor],
    }),
    st(23, 'select', '¿En qué estado está el inmueble hoy?', 'vende_estado', {
      ...TB.inmVenta,
      options: opts([
        { label: 'Excelente / listo', value: 'excelente' },
        { label: 'Bueno, detalles menores', value: 'bueno' },
        { label: 'Requiere remodelación', value: 'remodelar' },
      ]),
      conditions: [...skVendedor],
    }),
    st(24, 'select', '¿Qué tan urgente es vender?', 'vende_urgencia', {
      ...TB.inmVenta,
      options: opts([
        { label: 'Alta (<2 meses)', value: 'alta' },
        { label: 'Media (3–6 meses)', value: 'media' },
        { label: 'Baja — esperamos precio justo', value: 'baja' },
      ]),
      conditions: [...skVendedor],
    }),
    st(25, 'select', '¿El inmueble ya estuvo publicado en venta antes?', 'vende_listado', {
      ...TB.inmVenta,
      options: opts([
        { label: 'No', value: 'no' },
        { label: 'Sí, con agencia', value: 'agencia' },
        { label: 'Sí, por cuenta propia', value: 'propio' },
      ]),
      conditions: [...skVendedor],
    }),
    st(26, 'long_text', '¿Algo más que debamos saber?', 'notas_extra', {
      ...TB.inmCierre,
      required: false,
      hint: 'Opcional: restricciones del edificio, horarios de visita, copropiedad…',
    }),
  ],
}
