import { z } from 'zod'

const StepOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  emoji: z.string().nullable(),
  order: z.number(),
})

const SingleConditionSchema = z.object({
  if: z.string(),
  equals: z.string(),
  skip_to: z.number(),
})

/** Una regla o varias (OR): si la respuesta coincide con `equals`, se salta el paso hacia `skip_to`). */
const ConditionSchema = z.union([SingleConditionSchema, z.array(SingleConditionSchema)]).nullable()

const FileConfigSchema = z.object({
  accept: z.array(z.string()),
  max_size_mb: z.number(),
  max_files: z.number(),
}).nullable()

export const StepSchema = z.object({
  order: z.number(),
  type: z.enum([
    'text', 'long_text', 'select', 'multi_select',
    'email', 'phone', 'number', 'rating', 'yes_no', 'file'
  ]),
  question: z.string(),
  hint: z.string().nullable(),
  placeholder: z.string().nullable(),
  variable_name: z.string(),
  required: z.boolean(),
  conditions: ConditionSchema,
  file_config: FileConfigSchema,
  /** Opcional: solo panel Dilo (plantillas / edición manual). */
  branch_label: z.string().max(80).nullable().optional(),
  branch_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  options: z.array(StepOptionSchema).nullable(),
})

export const FlowGenerationSchema = z.object({
  flow: z.object({
    name: z.string(),
    /** Resumen en 1–3 frases: qué recoge el flow y para quién (pantalla de presentación). */
    description: z.string().min(1).max(1200),
    settings: z.object({
      language: z.enum(['es', 'en']),
      completion_message: z.string(),
      /** Obligatorio en el JSON: OpenAI `strict` exige que toda clave de `properties` vaya en `required`. */
      transition_style: z.enum(['ai', 'none']),
      tone: z.string().max(200),
      /** Saludo inicial del chat; `""` si prefieres que la app arme el texto desde `description`. */
      chat_intro: z.string().max(2000),
    }),
    scoring_criteria: z.object({
      hot: z.string(),
      warm: z.string(),
      cold: z.string(),
    }),
  }),
  steps: z.array(StepSchema),
})

export type FlowGeneration = z.infer<typeof FlowGenerationSchema>
export type GeneratedStep = z.infer<typeof StepSchema>
