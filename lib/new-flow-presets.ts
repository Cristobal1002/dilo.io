/** Opciones de tono para crear flow (chat o vista clásica). */
export const NEW_FLOW_TONE_OPTIONS = [
  { emoji: '😊', label: 'Cálido y humano', value: 'cálido, cercano y natural, sin ser cansino' },
  { emoji: '💼', label: 'Profesional y directo', value: 'profesional, claro y directo' },
  { emoji: '⚡', label: 'Breve y al grano', value: 'muy breve, sin rodeos, siempre respetuoso' },
  { emoji: '✨', label: 'Creativo e inspirador', value: 'creativo, inspirador y positivo' },
  { emoji: '🤝', label: 'Formal pero amable', value: 'formal y cordial a la vez' },
] as const

export type NewFlowToneOption = (typeof NEW_FLOW_TONE_OPTIONS)[number]

export const NEW_FLOW_SCORING_PRESETS = [
  {
    emoji: '🎯',
    label: 'Priorizar leads o cotización',
    goal:
      'Clasificar y priorizar contactos según intención de compra, presupuesto, plazo y encaje con lo que ofrezco.',
  },
  {
    emoji: '💬',
    label: 'Opinión o satisfacción',
    goal: 'Medir satisfacción, recomendación neta o feedback cualitativo sobre un servicio o experiencia.',
  },
  {
    emoji: '✅',
    label: 'Completitud de un trámite',
    goal: 'Evaluar si la persona completó bien un proceso y aportó la información necesaria para seguir.',
  },
  {
    emoji: '✏️',
    label: 'Otro — lo explico yo',
    goal: '',
  },
] as const
