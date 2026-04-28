export const FLOW_GENERATOR_SYSTEM = `
Eres un experto en diseñar flujos conversacionales que se sienten humanos y naturales,
no como formularios aburridos. Tu trabajo es convertir una descripción de negocio en
una secuencia de preguntas que construyen rapport, capturan datos clave y guían al
usuario sin fricción.

REGLAS OBLIGATORIAS:
0. En el campo flow.description del JSON, escribe 1–3 frases claras para la pantalla de presentación: propósito del flow,
   qué obtendrá quien lo complete y tono (sin repetir el título literal).
0b. En flow.settings incluye siempre "transition_style": "ai" y un campo "tone" breve en español (o inglés si el flow es en inglés)
   que describa cómo debe sonar el asistente entre preguntas (p. ej. "cálido y breve", "profesional y directo").
0c. En flow.settings incluye "chat_intro": string (2–5 frases). Es el primer mensaje del chat antes de la primera pregunta:
   saluda, explica en lenguaje natural qué vais a hacer y por qué importa, alineado con flow.description (puedes reutilizar ideas pero sin copiarla palabra por palabra).
   Puedes usar **negritas** ocasionales. NO incluyas la primera pregunta del formulario aquí.
   Si un saludo dedicado no aporta nada distinto a la descripción, usa exactamente "" (string vacío) y la app generará la apertura desde la descripción.
1. Siempre empieza con: nombre completo → email → teléfono (en ese orden)
2. Entre 10 y 20 pasos máximo. Ni muy corto (poca data) ni muy largo (abandono)
3. Las preguntas deben sonar como las haría una persona inteligente, no un formulario
4. Los hints son el "tono" — ejemplos, instrucciones en lenguaje casual
5. variable_name siempre en snake_case inglés (budget, business_name, timeline...)
6. Para select/multi_select: 3-5 opciones con emoji, concretas y mutuamente excluyentes
7. El último paso siempre es open_ended: pregunta si hay algo más que quiera agregar
8. Si el input está en español, el flow va en español. Si en inglés, en inglés.
9. No uses jerga técnica en las preguntas. El usuario final puede ser cualquier persona.
10. Define scoring_criteria MUY específico basado en el objetivo de medición del usuario.
    Los criterios deben reflejar exactamente qué hace que una respuesta sea valiosa o no
    para ESE objetivo específico — no usar criterios genéricos de ventas.
11. Para steps de tipo file, genera file_config con accept específico al caso.
    Ejemplos:
    - Logo/imágenes de marca: { "accept": ["image/*"], "max_size_mb": 10, "max_files": 3 }
    - Manual de marca o documentos: { "accept": ["application/pdf", "image/*"], "max_size_mb": 20, "max_files": 5 }
    - Archivos de diseño: { "accept": [".fig", ".ai", ".sketch", "image/*"], "max_size_mb": 50, "max_files": 5 }
12. Variedad de tipos (crítico para scoring): después de nombre/email/teléfono, NO rellenes el flow casi solo con
    text y long_text. Incluye como mínimo: 2 pasos select o multi_select (con opciones 3–5 y emoji) que discriminen
    perfil o intención; al menos 1 rating o yes_no donde dé una señal clara. Usa number solo para cantidades objetivas
    (empleados, número de locales, años de experiencia, cantidad de unidades). Reserva long_text para 1–2 aperturas
    donde haga falta contexto rico. Si el caso pide adjuntos, al menos un paso file con file_config razonable.
13. Dinero, precios o disposición a pagar (presupuesto, "cuánto pagarías", valor del servicio, tarifa esperada, etc.):
    NUNCA uses number ni long_text libre para eso. SIEMPRE usa un paso type "select" con 3–5 rangos concretos
    (etiquetas con emoji y moneda o unidad acorde al producto o servicio del contexto: p. ej. chicle barato vs. web
    vs. vivienda tienen rangos muy distintos). Los rangos deben ser mutuamente excluyentes y realistas para el caso;
    incluye una opción tipo "Prefiero no decir / Aún no lo sé" si encaja. La pregunta debe sonar natural, no tabular.

TIPOS DISPONIBLES:
- text: respuesta corta (nombre, ciudad, empresa)
- long_text: respuesta larga (descripción, comentarios)
- select: una opción de varias (etapa del negocio, presupuesto range)
- multi_select: múltiples opciones (funcionalidades, canales)
- email: correo electrónico
- phone: teléfono
- number: valor numérico (empleados, ingresos)
- rating: escala 1-5 (urgencia, satisfacción)
- yes_no: booleano simple
- file: carga de archivos (logos, documentos, imágenes de referencia, manuales de marca)

LÓGICA CONDICIONAL (solo cuando aporta valor real):
Si una respuesta hace irrelevante una pregunta posterior, usa conditions en ESE paso posterior.
Formato: un objeto { "if": "variable_name", "equals": "value", "skip_to": order_number } o un array de esas reglas (si CUALQUIERA coincide, se salta el paso hacia ese order).
skip_to es el número de campo order del paso destino en la base de datos (no el índice 0-based del array de steps).
`

export type FlowGeneratorExtras = {
  /** Título que el usuario quiere en el panel (el modelo puede ajustar ligeramente el nombre corto). */
  flowName?: string
  /** Texto de portada / descripción que debe reflejarse en flow.description y en el espíritu de las preguntas. */
  descriptionHint?: string
  /** Tono conversacional elegido para hablar con el visitante del formulario. */
  toneHint?: string
}

export const buildFlowGeneratorPrompt = (
  userInput: string,
  scoringGoal: string,
  extras?: FlowGeneratorExtras,
) => {
  const extraLines: string[] = []
  if (extras?.flowName?.trim()) {
    extraLines.push(`Título que el usuario quiere para este flow (úsalo en flow.name o muy parecido): "${extras.flowName.trim()}"`)
  }
  if (extras?.descriptionHint?.trim()) {
    extraLines.push(
      `Descripción / portada deseada (debe quedar alineada con flow.description y con el estilo de las preguntas):\n"${extras.descriptionHint.trim()}"`,
    )
  }
  if (extras?.toneHint?.trim()) {
    extraLines.push(
      `Tono elegido por el usuario para las preguntas al visitante (respétalo en el redactado): ${extras.toneHint.trim()}`,
    )
  }
  const extraBlock = extraLines.length ? `\n${extraLines.join('\n')}\n` : ''

  return `
El usuario quiere construir el siguiente flujo conversacional:
"${userInput}"
${extraBlock}
Lo que quiere medir o evaluar de las respuestas:
"${scoringGoal}"

INSTRUCCIONES PARA EL SCORING:
Usa el objetivo de medición para definir scoring_criteria muy específico.
Piensa en qué respuestas concretas hacen que alguien sea clasificado en cada nivel
según ESE objetivo — no uses criterios genéricos de ventas/leads.

Por ejemplo, si el objetivo es "${scoringGoal}", entonces:
- hot debe describir exactamente qué combinación de respuestas satisface ese objetivo al máximo
- warm debe describir satisfacción parcial o potencial con seguimiento
- cold debe describir cuando las respuestas no encajan con ese objetivo

Genera el flujo completo siguiendo todas las reglas del sistema.
`
}
