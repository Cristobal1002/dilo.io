# Dilo — AI Flow Builder

> Transforma un prompt de texto en un flujo conversacional inteligente que captura, entiende y activa datos automáticamente.

**Producto:** [getdilo.io](https://getdilo.io)  
**Stack:** Next.js 16 · Drizzle ORM · Neon PostgreSQL · Clerk Auth · Vercel AI SDK · OpenAI

---

## Tabla de contenidos

1. [Visión del producto](#1-visión-del-producto)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estructura del proyecto](#3-estructura-del-proyecto)
4. [Base de datos](#4-base-de-datos)
5. [Patrones de arquitectura](#5-patrones-de-arquitectura)
6. [Infraestructura de código](#6-infraestructura-de-código)
7. [Estándares de API](#7-estándares-de-api)
8. [Manejo de errores](#8-manejo-de-errores)
9. [Logging](#9-logging)
10. [Variables de entorno](#10-variables-de-entorno)
11. [Setup local](#11-setup-local)
12. [Convenciones del equipo](#12-convenciones-del-equipo)
13. [Roadmap — próxima semana](#13-roadmap--próxima-semana)
14. [Sprint 1 — spec y checklist](#14-sprint-1--spec-y-checklist)

---

## 14. Sprint 1 — spec y checklist

Documento de trabajo del equipo (orden de implementación, QA, convenciones de dominio y contratos de API):

- **[docs/SPRINT1.md](./docs/SPRINT1.md)**

Resumen: branding en flow público → email al completar (Resend) → embed (`public/embed.js` + `?embed=1`) → transiciones con IA (`/acknowledge` + settings en builder). Todo el mundo público debe usar **`NEXT_PUBLIC_APP_URL`** como origen canónico (p. ej. `https://getdilo.io`).

---

## 1. Visión del producto

Dilo no compite con form builders como Typeform o Tally. Compite en una capa diferente: **la activación de datos**.

```
Antes:  formulario → reunión de discovery → entendimiento manual
Ahora:  prompt → flujo conversacional → resumen automático → acción
```

**Casos de uso iniciales:**
- Agencias/freelancers: discovery de proyectos y pre-cotización automática
- Inmobiliarias: clasificación de leads con scoring
- Organizaciones: captura masiva de información y segmentación

---

## 2. Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack en un solo repo, server components, sin Express separado |
| Base de datos | Neon (PostgreSQL serverless) | Escalado automático, branching de BD por ambiente |
| ORM | Drizzle ORM | Type-safe, sin magic, SQL visible, migraciones predecibles |
| Auth | Clerk | Multi-tenant con Organizations out-of-the-box, webhooks, UI incluida |
| IA | Vercel AI SDK + OpenAI GPT-4o-mini | `generateObject` con structured outputs validados por Zod |
| Deploy | Vercel | Edge functions, preview por rama, logs estructurados |
| Logger | Pino | Logger estructurado de alta performance, redacción de secretos |
| Validación | Zod | Validación en todas las fronteras: API inputs, LLM outputs, env vars |

---

## 3. Estructura del proyecto

```
dilo/
├── app/
│   ├── dashboard/                ← Área autenticada (layout con sidebar)
│   │   ├── page.tsx              ← Lista de flows del usuario
│   │   └── flows/
│   │       ├── new/
│   │       │   └── page.tsx      ← [CLIENT] Generador: prompt → IA → redirect
│   │       └── [flowId]/
│   │           ├── page.tsx      ← [SERVER] Detalle del flow + lista de steps
│   │           └── flow-editor.tsx  ← [CLIENT] Botón publicar/archivar
│   │
│   ├── f/[flowId]/               ← Flow público (usuario final responde, sin auth)
│   │   └── page.tsx
│   │
│   ├── api/
│   │   ├── flows/
│   │   │   ├── generate/
│   │   │   │   └── route.ts      ← POST: prompt → GPT-4o-mini → DB
│   │   │   └── [flowId]/
│   │   │       └── route.ts      ← PATCH: status, name
│   │   ├── f/[flowId]/           ← API pública para sesiones de usuario final
│   │   └── webhooks/             ← Clerk webhooks
│   │
│   ├── sign-in/ y sign-up/       ← Clerk hosted UI
│   ├── layout.tsx                ← Root layout con ClerkProvider
│   └── page.tsx                  ← Landing page
│
├── db/
│   ├── schema.ts                 ← Fuente de verdad: todas las tablas Drizzle
│   └── index.ts                  ← Conexión Neon + export `db`
│
├── lib/
│   ├── env.ts                    ← Variables de entorno validadas con Zod
│   ├── errors.ts                 ← Jerarquía de errores tipados (AppError)
│   ├── logger.ts                 ← Pino: pretty en dev, JSON en prod
│   ├── api-response.ts           ← Builders de respuesta estándar
│   ├── auth.ts                   ← getAuthContext(): user + org lazy-created
│   ├── with-api-handler.ts       ← HOF que envuelve todas las API routes
│   ├── prompts/
│   │   └── generate-flow.ts      ← System prompt + user prompt builder
│   └── schemas/
│       └── flow-generation.ts    ← Zod schema para el output del LLM
│
├── middleware.ts                 ← Clerk: rutas públicas vs protegidas
├── drizzle.config.ts
├── .env.local                    ← NO commitear — ver sección de env vars
└── package.json
```

### Regla fundamental de routing

| Contexto | Patrón | Acceso a BD |
|---|---|---|
| Dashboard (autenticado) | Server Component | Directo con Drizzle — sin API route intermedia |
| Flow público (anónimo) | API route `app/api/f/` | Sí, con token de sesión en localStorage |
| Mutaciones del dashboard | API route `app/api/flows/` | Sí, con `withApiHandler` + Clerk auth |

**Regla:** No crear API routes solo para leer datos en el dashboard. Los Server Components pueden leer la BD directamente — es más simple, más rápido y más seguro.

---

## 4. Base de datos

### Diagrama de entidades

```
organizations
    └── users (clerkId → Clerk user)
    └── flows
            └── steps
            │       └── step_options
            └── sessions (token único por respondente)
            │       └── answers (una por step)
            │       └── results (generado por IA al completar)
            └── webhooks
                    └── webhook_deliveries
```

### Tablas principales

**`flows`** — El flujo conversacional
- `status`: `draft` | `published` | `archived`
- `settings` (jsonb): `{ language, completion_message }`
- `scoring_criteria` (jsonb): `{ hot, warm, cold }` — criterios para clasificar leads
- `prompt_origin`: texto original que generó el flow

**`steps`** — Cada pregunta del flow
- `type`: `text | long_text | select | multi_select | email | phone | number | rating | yes_no | file`
- `variable_name`: identificador snake_case en inglés (e.g. `budget`, `timeline`) — puente entre captura y análisis IA
- `conditions` (jsonb): lógica condicional `{ if, equals, skip_to }`
- `file_config` (jsonb): para steps tipo `file` — `{ accept, max_size_mb, max_files }`

**`sessions`** — Una respuesta de un usuario final
- `token`: UUID único — persiste en localStorage del respondente para reanudar
- `status`: `in_progress` | `completed` | `abandoned`
- `contact` (jsonb): nombre, email, teléfono extraídos de las respuestas

**`results`** — Output del análisis IA al completar una sesión
- `score` (0-100): scoring del lead
- `classification`: `hot` | `warm` | `cold`
- `suggested_action`: acción recomendada en texto libre
- `structured_data` (jsonb): datos estructurados para integraciones externas

### Convenciones de schema

- UUIDs como PKs (`.defaultRandom()`) — sin integers autoincrementales
- `created_at` en todas las tablas, `updated_at` donde hay mutaciones frecuentes
- Índices en todas las FKs usadas en queries (`flows_org_idx`, `sessions_token_idx`, etc.)
- `CASCADE` en todos los `onDelete` — borrar un flow limpia todo lo relacionado
- `jsonb` para datos variables/configuración — no crear columnas para cada campo opcional

---

## 5. Patrones de arquitectura

### Red flags a evitar en este proyecto

- **No crear un servidor Express separado** — todo va en Next.js API Routes.
- **No usar `useEffect` para fetching** — usar Server Components o SWR/React Query si necesitas client-side.
- **No compartir estado entre el dashboard y el flow público** — son contextos completamente separados.
- **No hardcodear organization IDs** — siempre obtener de Clerk `auth()` (en API routes, el contexto que expone `withApiHandler`).
- **No enviar datos sensibles al cliente innecesariamente**.

### Server Components para lectura (dashboard)

```typescript
// ✅ CORRECTO — leer datos directamente en el Server Component
export default async function FlowDetailPage({ params }) {
  const { flowId } = await params
  const { userId, orgId } = await auth()

  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.id, flowId), eq(flows.organizationId, orgId ?? userId))
  })

  return <FlowDetail flow={flow} />
}

// ❌ INCORRECTO — no crear GET /api/flows solo para el dashboard
// fetch('/api/flows') desde useEffect en un Client Component
```

### API Routes para mutaciones (con `withApiHandler`)

Todo route handler autenticado usa `withApiHandler`. Nunca importar `auth()` de Clerk directamente en una route.

```typescript
// app/api/flows/[flowId]/route.ts
export const PATCH = withApiHandler(async (req, { auth, params }) => {
  const { org } = auth        // ya resuelto, con org lazy-created
  const { flowId } = params   // ya extraído del segmento de ruta

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('Datos inválidos', parsed.error.flatten())

  const [updated] = await db.update(flows)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(flows.id, flowId), eq(flows.organizationId, org.id)))
    .returning()

  if (!updated) throw new NotFoundError('Flow')

  return apiSuccess({ flow: updated })
}, { requireAuth: true })
```

### Client Components — solo cuando hay interactividad real

```typescript
// Usar 'use client' solo cuando se necesite:
// - useState / useReducer
// - Eventos del DOM (onClick, onChange, etc.)
// - Hooks de browser (useRouter, useEffect, refs)
// - Librerías que no soportan SSR

'use client'
export default function FlowEditor({ flowId, status }) {
  const [loading, setLoading] = useState(false)
  // ...
}
```

### Multi-tenancy con Clerk

Cada usuario pertenece a una organización. Si usa Clerk Organizations, `orgId` es el ID de la org. Si no, `userId` actúa como fallback (una org por usuario). **Nunca hardcodear un orgId.**

```typescript
// En Server Components:
const { userId, orgId } = await auth()
const identifier = orgId ?? userId  // siempre este patrón

// En API routes — ya resuelto por withApiHandler:
const { org } = auth  // org.id es siempre el identificador correcto
```

### Generación IA con structured outputs

Usar siempre `generateObject` con un Zod schema. **Regla crítica de OpenAI:** todos los campos deben estar en `required` — usar `.nullable()` en lugar de `.optional()` (OpenAI rechaza schemas con campos opcionales).

```typescript
const { object } = await generateObject({
  model: openai('gpt-4o-mini'),
  schema: FlowGenerationSchema,     // todos los campos required, usar .nullable()
  system: FLOW_GENERATOR_SYSTEM,
  prompt: buildFlowGeneratorPrompt(userInput),
})
// `object` ya está validado y tipado — cero casteos necesarios
```

---

## 6. Infraestructura de código

### `lib/env.ts` — Variables de entorno tipadas

**Nunca usar `process.env.X` directamente.** Importar siempre desde `@/lib/env`. El servidor falla en el arranque si falta alguna variable requerida.

```typescript
import { env } from '@/lib/env'

env.NEXT_PUBLIC_APP_URL   // ✅ tipado, validado
process.env.OPENAI_API_KEY // ❌ sin tipos, falla silenciosamente
```

### `lib/with-api-handler.ts` — Wrapper de route handlers

Provee: resolución de `auth` con lazy org creation, extracción de `params`, try/catch centralizado hacia `handleApiError`, y logging de timing por request.

### `lib/auth.ts` — Contexto de autenticación

`getAuthContext()` resuelve el usuario autenticado y su organización. Si la org no existe (primer login), la crea junto con el registro de usuario. No hay paso de onboarding separado.

---

## 7. Estándares de API

### Shape de respuesta — siempre consistente

```json
// Éxito
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

### Builders en `lib/api-response.ts`

```typescript
apiSuccess(data)        // 200
apiCreated(data)        // 201
apiNoContent()          // 204
handleApiError(unknown) // catch general → respuesta de error estándar
```

### El cliente siempre verifica `data.success`

```typescript
const res = await fetch('/api/flows/generate', { method: 'POST', ... })
const data = await res.json()

if (!data.success) {
  // data.error.code → branch por tipo de error
  // data.error.message → mostrar al usuario
  throw new Error(data.error.message)
}
// data.data.flow → acceso tipado al resultado
```

---

## 8. Manejo de errores

### Jerarquía en `lib/errors.ts`

```
AppError (base)
├── ValidationError    400  VALIDATION_ERROR   — input inválido
├── UnauthorizedError  401  UNAUTHORIZED       — no autenticado
├── ForbiddenError     403  FORBIDDEN          — autenticado pero sin permiso
├── NotFoundError      404  NOT_FOUND          — recurso no existe
├── ConflictError      409  CONFLICT           — duplicado o estado inválido
├── RateLimitError     429  RATE_LIMIT         — demasiadas solicitudes
└── InternalError      500  INTERNAL_ERROR     — error inesperado
```

### Reglas

1. **Throw, no return.** Lanzar `AppError` — nunca retornar manualmente un `NextResponse` de error.
2. **Conocidos vs desconocidos.** `handleApiError` distingue: `AppError` → log warn. Cualquier otra cosa → log error con stack trace, devuelve `InternalError` genérico al cliente.
3. **No filtrar detalles internos.** El mensaje de `InternalError` es genérico por diseño. El stack trace va al log, no al cliente.

```typescript
// ✅ Correcto
if (!flow) throw new NotFoundError('Flow')

// ❌ Incorrecto — rompe el estándar de respuesta
if (!flow) return NextResponse.json({ error: 'not found' }, { status: 404 })
```

---

## 9. Logging

Nunca `console.log` en producción. Siempre el logger de `lib/logger.ts`.

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('flows/generate')  // scope del módulo

// Estructura: objeto de contexto primero, mensaje como string al final
log.info({ flowId, orgId, stepCount: 12 }, 'Flow generado exitosamente')
log.warn({ code: err.code, userId }, 'Intento de acceso denegado')
log.error({ err, flowId }, 'Error inesperado en generación IA')
```

**En desarrollo:** pretty-print con colores (pino-pretty)
**En producción (Vercel):** JSON estructurado — visible en Vercel Logs con filtros

**Campos redactados automáticamente:** `authorization`, `cookie`, `password`, `token`, `apiKey`, `secret`

| Nivel | Cuándo usar |
|---|---|
| `error` | Errores inesperados, excepciones no manejadas, errores 5xx |
| `warn` | Errores esperados: 4xx, intentos inválidos, degradación de servicio |
| `info` | Operaciones importantes: flow creado, sesión completada, webhook enviado |
| `debug` | Detalle de ejecución — desactivado en prod por defecto |

---

## 10. Variables de entorno

Crear `.env.local` en la raíz (nunca commitear este archivo):

```bash
# Base de datos — Neon
DATABASE_URL=postgresql://...

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# OpenAI
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend — digest semanal/diario y alertas por lead (opcional en local)
# RESEND_API_KEY=re_...
# RESEND_FROM_EMAIL=notificaciones@tu-dominio-verificado.com

# Cron en Vercel — resúmenes por email (misma ruta que `vercel.json` → `/api/cron/digest-notifications`)
# CRON_SECRET=una-cadena-larga-aleatoria

# Logging (opcional — default: info)
LOG_LEVEL=debug
NODE_ENV=development
```

En Vercel: **Settings → Environment Variables**. Las variables `NEXT_PUBLIC_*` deben configurarse también ahí para estar disponibles en el browser.

---

## 11. Setup local

**Requisito previo:** Node >= 20.9.0 (Next.js 16 lo requiere estrictamente)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Neon, Clerk y OpenAI

# 3. Aplicar schema a la base de datos
npm run db:push

# 4. Iniciar servidor de desarrollo
npm run dev
# → http://localhost:3000
```

### Scripts disponibles

```bash
npm run dev           # Servidor con hot reload
npm run build         # Build de producción
npm run start         # Correr build de producción localmente

npm run db:push       # Aplicar cambios del schema a la BD (desarrollo)
npm run db:generate   # Generar archivos de migración SQL
npm run db:studio     # Abrir Drizzle Studio (UI visual de la BD)

npx tsc --noEmit      # Verificar TypeScript sin compilar
```

---

## 12. Convenciones del equipo

### Nomenclatura

| Contexto | Formato | Ejemplo |
|---|---|---|
| Archivos | kebab-case | `flow-editor.tsx`, `with-api-handler.ts` |
| Componentes React | PascalCase | `FlowEditor`, `StepCard` |
| Variables/funciones | camelCase | `getAuthContext`, `flowSteps` |
| Columnas de BD | snake_case | `variable_name`, `flow_id` |
| Constantes de módulo | SCREAMING_SNAKE | `FLOW_GENERATOR_SYSTEM` |

### Commits

```
feat(flows): agregar soporte para tipo de step "file"
fix(auth): corregir lazy creation cuando orgId es null
refactor(api): mover validación de schema a lib/schemas
chore(deps): actualizar drizzle-orm a 0.45.2
```

### TypeScript

- `strict: true` sin excepciones — no bajar esta configuración
- No usar `any` — preferir `unknown` con type guards o casteos explícitos
- Los campos `jsonb` de Drizzle son `unknown` en runtime — siempre castear o tipar al usarlos en JSX o lógica de negocio
- Zod valida en runtime lo que TypeScript no puede garantizar (inputs externos, outputs del LLM, datos de BD)

### Agregar un nuevo feature — checklist

1. **Schema primero.** Actualizar `db/schema.ts`, correr `db:push`
2. **Zod schemas.** Si hay output de IA o input de API, crear el schema en `lib/schemas/`
3. **API route.** Usar `withApiHandler`. Validar con Zod antes de tocar la BD. Lanzar `AppError`, no retornar errores manuales.
4. **UI.** Server Component si solo lee datos. `'use client'` solo si hay interactividad.
5. **Logging.** Agregar `createLogger('nombre-modulo')` al inicio del archivo.

---

## 13. Roadmap — próxima semana

### Día 3 — UI del flow público (chat conversacional)

**Objetivo:** El usuario final puede responder un flow publicado en `/f/[flowId]`

- [ ] `app/f/[flowId]/page.tsx` — Server Component que carga el flow y sus steps
- [ ] `app/f/[flowId]/flow-chat.tsx` — Client Component con la UI tipo chat
  - Mostrar preguntas de a una con animación de entrada
  - Renderizar input según tipo de step (`text`, `select`, `yes_no`, `rating`, `file`, etc.)
  - Barra de progreso (step actual / total)
  - Avance automático en `select` y `yes_no`, botón "continuar" en los demás
- [ ] `POST /api/f/[flowId]/sessions` — crear sesión, devolver token
- [ ] `POST /api/f/[flowId]/sessions/[token]/answers` — guardar respuesta por step
- [ ] Persistencia en localStorage: si el usuario vuelve, retomar desde donde lo dejó
- [ ] Pantalla de cierre/agradecimiento al completar todos los steps

---

### Día 4 — Persistencia robusta + carga de archivos

**Objetivo:** Sesiones resilientes y soporte para steps tipo `file`

- [ ] `GET /api/f/[flowId]/sessions/[token]` — devolver estado actual (step actual + respuestas dadas)
- [ ] Lógica de recuperación: al entrar con token existente, ir directo al step no respondido
- [ ] Integrar **Uploadthing** para steps tipo `file`
  - `app/api/uploadthing/route.ts` — file router configurado
  - Componente `FileUploadStep` con drag & drop, preview y validación de `fileConfig`
  - Guardar URL del archivo como `answer.value`
- [ ] Lógica condicional: leer `step.conditions`, hacer skip al step correcto según respuesta

---

### Día 5 — Analizador de resultados con IA

**Objetivo:** Al completar una sesión, generar automáticamente el análisis del lead

- [ ] `POST /api/f/[flowId]/sessions/[token]/complete` — marcar completada y disparar análisis
- [ ] `lib/schemas/result-analysis.ts` — Zod schema para el output del análisis
- [ ] `lib/prompts/analyze-session.ts` — prompt que recibe respuestas + `scoring_criteria` y devuelve `{ summary, score, classification, suggested_action, structured_data }`
- [ ] Guardar resultado en tabla `results`
- [ ] Pantalla de resultado para el usuario final (resumen de lo compartido + mensaje de cierre)

---

### Día 6 — Dashboard de resultados + webhooks

**Objetivo:** El creador del flow puede ver y actuar sobre los leads capturados

- [ ] `app/dashboard/flows/[flowId]/results/page.tsx` — tabla de sesiones completadas con score, clasificación y fecha
- [ ] Panel de detalle de sesión: respuestas completas + resultado del análisis IA
- [ ] `app/dashboard/flows/[flowId]/settings/page.tsx` — configurar webhooks (URL + secret HMAC)
- [ ] `lib/webhook.ts` — servicio de envío con reintentos y backoff
  - Payload: `{ event: "session.completed", session, answers, result }`
  - Registrar cada intento en `webhook_deliveries`

---

### Día 7 — Deploy en Vercel + polish final

**Objetivo:** Producto en producción en getdilo.io, listo para primeros usuarios

- [ ] Conectar repo a Vercel, configurar variables de entorno de producción
- [ ] Configurar dominio `getdilo.io` en Vercel DNS
- [ ] Branch de producción en Neon (separado del desarrollo)
- [ ] **Fix TypeScript:** resolver error `Type 'unknown' is not assignable to ReactNode` en `app/dashboard/flows/[flowId]/page.tsx` — tipar explícitamente los campos `jsonb` en el componente
- [ ] **Dashboard:** implementar lista real de flows en `app/dashboard/page.tsx` (actualmente muestra empty state estático)
- [ ] **SEO básico:** `metadata` en layout y páginas públicas (`title`, `description`, `og:image`)
- [ ] **Error boundaries:** `error.tsx` y `not-found.tsx` en rutas clave
- [ ] **Test end-to-end manual:** crear flow → publicar → responder como usuario final → ver resultado en dashboard → verificar webhook

---

### Deuda técnica conocida

| Item | Impacto | Target |
|---|---|---|
| Dashboard sin lista de flows reales | Alto — no se puede navegar flows existentes | Día 7 |
| TypeScript error en `page.tsx` (jsonb → unknown) | Medio — no bloquea funcionalidad | Día 7 |
| Rate limiting en `/api/flows/generate` | Alto para producción pública | Antes de launch |
| Skip logic condicional en flows | Medio — flows más inteligentes | Día 4 |
| Tests automatizados | Bajo para MVP | Post-launch |

---

*Última actualización: Semana 1 — stack base completado, generación de flows con IA funcional.*
