# Dilo — Integración WhatsApp Business API (spec v0.2)

**Estado:** spec interna — pendiente de implementación.  
**Stack:** Next.js 16 App Router · Drizzle · Neon PostgreSQL · Clerk · Vercel  
**Approach:** Meta Cloud API directa + Embedded Signup (cada workspace conecta su WABA)  
**Dominio canónico:** `NEXT_PUBLIC_APP_URL` (p. ej. `https://getdilo.io`)  
**Fecha:** Mayo 2026

> Esta spec reemplaza el borrador genérico `whatsapp-integration-dilo.md`. Está alineada al repo actual: `org_integration_credentials`, `lib/integration-crypto.ts`, `withApiHandler`, `processSessionCompletion`, `proxy.ts`.

---

## Tabla de contenidos

1. [Visión y modelo de producto](#1-visión-y-modelo-de-producto)
2. [Convenciones del repo (obligatorias)](#2-convenciones-del-repo-obligatorias)
3. [Pre-requisitos del cliente](#3-pre-requisitos-del-cliente)
4. [Setup Meta (una vez, Dilo como plataforma)](#4-setup-meta-una-vez-dilo-como-plataforma)
5. [Flujo Embedded Signup (OAuth correcto)](#5-flujo-embedded-signup-oauth-correcto)
6. [Base de datos](#6-base-de-datos)
7. [Cifrado de credenciales](#7-cifrado-de-credenciales)
8. [API — conectar / desconectar / estado](#8-api--conectar--desconectar--estado)
9. [Webhook entrante Meta](#9-webhook-entrante-meta)
10. [Envío de plantillas](#10-envío-de-plantillas)
11. [Config por flow (connectors)](#11-config-por-flow-connectors)
12. [Disparo al completar sesión](#12-disparo-al-completar-sesión)
13. [Plantillas WhatsApp (Fase 3)](#13-plantillas-whatsapp-fase-3)
14. [UI](#14-ui)
15. [Variables de entorno](#15-variables-de-entorno)
16. [Roadmap por fases](#16-roadmap-por-fases)
17. [QA y criterios de aceptación](#17-qa-y-criterios-de-aceptación)
18. [Compliance, costos y riesgos](#18-compliance-costos-y-riesgos)

---

## 1. Visión y modelo de producto

Cada **workspace** (organización en Dilo) conecta **su propia** cuenta de WhatsApp Business. Dilo no es dueño del número; es el software que envía/recibe vía Cloud API.

**MVP (v1):**

- Conectar WABA desde `/dashboard/settings/integrations`
- Configurar por flow: al completar sesión → enviar **plantilla UTILITY aprobada** al teléfono del visitante (si existe paso `phone` y la config está activa)
- Registrar mensajes y estados (`sent`, `delivered`, `read`, `failed`)
- Webhook Meta verificado y seguro

**Fuera de v1 (explícito):**

- Inbox / conversación bidireccional
- Respuestas automáticas a mensajes entrantes
- Múltiples números por workspace
- WhatsApp como canal alternativo al chat web (`/f/[flowId]`)

---

## 2. Convenciones del repo (obligatorias)

| Tema | En Dilo | ❌ No usar |
|------|---------|-----------|
| Middleware | `proxy.ts` | `middleware.ts` |
| Auth API | `withApiHandler` + `getAuthContext()` | `auth()` suelto en routes |
| Org ID | `auth.org.id` (UUID `organizations.id`) | Clerk `orgId` como FK |
| DB import | `@/db` | `@/lib/db` |
| Respuestas API | `apiSuccess` / errores tipados (`AppError`) | `NextResponse.json` ad hoc |
| Webhooks públicos | Ya cubiertos: `/api/webhooks/(.*)` en `proxy.ts` | Cambiar middleware |
| Integraciones | Tabla `org_integration_credentials` | Tabla `integrations` paralela |
| Cifrado | `lib/integration-crypto.ts` + `DILO_INTEGRATION_SECRETS_KEY` | `ENCRYPTION_KEY` / AES-CBC nuevo |
| Disparo post-flow | `processSessionCompletion` en `lib/session-completion.ts` | Nuevo `onFlowComplete` |
| Permisos connect | `requireOrgRoles(auth, ['owner', 'admin'])` | Cualquier miembro |

**Patrón fire-and-forget** (igual que alertas email):

```ts
void sendWhatsAppOnSessionComplete({ ... }).catch((err) => {
  log.error({ err, sessionId }, 'WhatsApp on complete failed')
})
```

No bloquear la respuesta al visitante ni el guardado de `results`.

---

## 3. Pre-requisitos del cliente

Antes de “Conectar WhatsApp”, el cliente debe tener:

1. **Meta Business Manager** verificado — [business.facebook.com](https://business.facebook.com)
2. **WhatsApp Business Account (WABA)** dentro del Business Manager
3. **Número de teléfono** dedicado a la API (no activo en la app WhatsApp consumer)

Dilo debe mostrar una checklist / enlace a doc de onboarding en la card de integración (similar al copy de Resend).

---

## 4. Setup Meta (una vez, Dilo como plataforma)

1. Crear app en [developers.facebook.com](https://developers.facebook.com)
   - Tipo: **Business**
   - Producto: **WhatsApp**
2. Configurar **Embedded Signup** → obtener `NEXT_PUBLIC_FACEBOOK_CONFIG_ID`
3. Credenciales app → `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
4. Webhook URL: `{NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
5. Suscribir eventos:
   - `messages`
   - `message_template_status_update`
6. **App Review** + verificación de negocio para producción (fuera de números de prueba)

Documentación de referencia: [WhatsApp Embedded Signup](https://developers.facebook.com/docs/whatsapp/embedded-signup) — **no** usar solo el flujo OAuth genérico `/me/businesses`.

---

## 5. Flujo Embedded Signup (OAuth correcto)

Embedded Signup **no es** intercambiar un code y luego listar businesses con user token. Combina SDK + postMessage + intercambio de code.

```
Dashboard → [Conectar WhatsApp]
        │
        ▼
Cargar Facebook JS SDK (client)
        │
        ▼
FB.login({ config_id, response_type: 'code', extras: { sessionInfoVersion: 2 } })
        │
        ├── postMessage / sessionInfo → waba_id, phone_number_id (guardar en cliente)
        └── authResponse.code
        │
        ▼
POST /api/settings/integrations/whatsapp/connect
  Body: { code, wabaId, phoneNumberId, displayPhone? }
        │
        ▼
Servidor:
  1. Intercambiar code → access_token (Graph OAuth con app secret)
  2. Validar que wabaId / phoneNumberId coinciden con lo reportado por Embedded Signup
  3. (Opcional) GET phone_numbers del WABA para display_phone
  4. Cifrar token → org_integration_credentials
  5. Guardar phoneNumberId, wabaId, displayPhone en columnas **sin cifrar** (lookup webhook)
        │
        ▼
UI: ✅ WhatsApp conectado · +57 300 …
```

**Decisiones:**

- **v1:** un WABA + un número por workspace (`UNIQUE organization_id + provider`).
- Token en `encrypted_payload`; IDs de Meta en columnas indexadas (ver §6).
- Si el intercambio de code falla → `ValidationError` / log; no dejar fila a medias.

**Frontend (referencia):**

- Ruta sugerida: extender `app/dashboard/settings/integrations/` (card WhatsApp, hoy “Próximamente”).
- Escuchar `window.addEventListener('message', …)` filtrando origin `https://www.facebook.com` para capturar `waba_id` y `phone_number_id` del Embedded Signup antes o junto al POST del code.

---

## 6. Base de datos

### 6.1 Extender `org_integration_credentials`

No crear tabla `integrations`. Ampliar la existente:

```ts
// db/schema.ts — campos nuevos (nullable; solo provider whatsapp los usa)

export const orgIntegrationCredentials = pgTable(
  'org_integration_credentials',
  {
    // ... existentes ...
    provider: text('provider').notNull(), // 'resend' | 'whatsapp'
    encryptedPayload: text('encrypted_payload').notNull(),
    /** Lookup webhook Meta → org (sin descifrar). Solo whatsapp. */
    phoneNumberId: text('phone_number_id'),
    wabaId: text('waba_id'),
    displayPhone: text('display_phone'),
    status: text('status').notNull().default('active'), // active | disconnected | error
    tokenExpiresAt: timestamp('token_expires_at'),
    lastError: text('last_error'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('org_integration_org_provider_uidx').on(t.organizationId, t.provider),
    uniqueIndex('org_integration_whatsapp_phone_uidx')
      .on(t.phoneNumberId)
      .where(sql`${t.provider} = 'whatsapp' AND ${t.phoneNumberId} IS NOT NULL`),
  ],
)
```

**Por qué columnas en claro:** el webhook trae `metadata.phone_number_id`; hay que resolver `organizationId` sin escanear/decifrar todos los blobs.

### 6.2 `whatsapp_templates`

Plantillas creadas desde Dilo y sincronizadas con Meta.

```ts
export const whatsappTemplates = pgTable('whatsapp_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),           // slug Meta (snake_case, único por WABA)
  language: text('language').notNull().default('es'),
  category: text('category').notNull(),   // UTILITY | MARKETING | AUTHENTICATION
  status: text('status').notNull().default('PENDING'), // PENDING | APPROVED | REJECTED
  components: jsonb('components').notNull(),
  metaTemplateId: text('meta_template_id'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('wa_templates_org_idx').on(t.organizationId),
  uniqueIndex('wa_templates_org_name_lang_uidx').on(t.organizationId, t.name, t.language),
])
```

### 6.3 `whatsapp_messages`

Auditoría + idempotencia + estados de entrega.

```ts
export const whatsappMessages = pgTable('whatsapp_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  direction: text('direction').notNull(), // outbound | inbound
  toNumber: text('to_number'),
  fromNumber: text('from_number'),
  templateId: uuid('template_id').references(() => whatsappTemplates.id, { onDelete: 'set null' }),
  templateName: text('template_name'),
  templateVars: jsonb('template_vars'),
  status: text('status').notNull().default('sent'), // sent | delivered | read | failed | received
  metaMessageId: text('meta_message_id'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('wa_messages_org_idx').on(t.organizationId),
  index('wa_messages_session_idx').on(t.sessionId),
  uniqueIndex('wa_messages_meta_id_uidx')
    .on(t.metaMessageId)
    .where(sql`${t.metaMessageId} IS NOT NULL`),
])
```

**Migración:** `db/migrations/0009_whatsapp_integration.sql` (o siguiente número disponible) + `npm run db:push` en prod con `DATABASE_URL` de Vercel.

---

## 7. Cifrado de credenciales

`lib/integration-crypto.ts` hoy está **tipado solo para Resend** (`apiKey`, `fromEmail`). Hay que extenderlo sin romper Resend.

### Payloads por provider

```ts
// lib/integration-payloads.ts (nuevo)

export type ResendIntegrationPayload = {
  apiKey: string
  fromEmail?: string | null
}

export type WhatsAppIntegrationPayload = {
  accessToken: string
  tokenType?: string | null
}

export type IntegrationPayload =
  | { provider: 'resend'; data: ResendIntegrationPayload }
  | { provider: 'whatsapp'; data: WhatsAppIntegrationPayload }
```

### API de cifrado

```ts
// lib/integration-crypto.ts

export function encryptIntegrationPayload(payload: IntegrationPayload): string
export function decryptIntegrationPayload(
  provider: 'resend' | 'whatsapp',
  blob: string,
): ResendIntegrationPayload | WhatsAppIntegrationPayload
```

- Misma capa AES-256-GCM + `DILO_INTEGRATION_SECRETS_KEY`.
- Validación Zod al descifrar según `provider`.
- Mantener `apiKeyLast4()` para Resend; añadir helper `tokenLast4()` para UI WhatsApp si aplica.

**❌ No** guardar `waba_id` / `phone_number_id` solo dentro del blob cifrado.

---

## 8. API — conectar / desconectar / estado

Todas con `withApiHandler`, `requireAuth: true`, `requireOrgRoles(['owner','admin'])`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/settings/integrations/whatsapp` | Estado: connected, displayPhone, wabaId (masked), sendReady |
| `POST` | `/api/settings/integrations/whatsapp/connect` | Body: `{ code, wabaId, phoneNumberId, displayPhone? }` |
| `DELETE` | `/api/settings/integrations/whatsapp` | Desconectar: status `disconnected`, borrar tokens, limpiar lookup IDs |

**Patrón:** espejar `app/api/settings/integrations/resend/route.ts` (GET/PATCH/DELETE, `rethrowUnlessMissingRelation`).

**Graph API version:** fijar constante `META_GRAPH_VERSION = 'v21.0'` (o la vigente al implementar) en `lib/whatsapp/constants.ts`.

---

## 9. Webhook entrante Meta

**Ruta:** `app/api/webhooks/whatsapp/route.ts`  
**Pública:** ya permitida en `proxy.ts`.

### GET — verificación

```
hub.mode=subscribe & hub.verify_token=WHATSAPP_WEBHOOK_VERIFY_TOKEN & hub.challenge=...
→ 200 + body = challenge (text/plain)
```

### POST — eventos

1. Leer body **raw** (string) para verificar firma.
2. Header `X-Hub-Signature-256`: `sha256=<hex>`
3. Calcular `HMAC-SHA256(rawBody, FACEBOOK_APP_SECRET)` y comparar en tiempo constante.
4. Si firma inválida → `403` + log (no procesar).
5. Parsear JSON; iterar `entry[].changes[].value`.

**Handlers v1:**

| Evento | Acción |
|--------|--------|
| `value.statuses[]` | `UPDATE whatsapp_messages SET status = … WHERE meta_message_id = …` |
| `value.messages[]` | Insert inbound + log; **sin** auto-respuesta en v1 |
| Template status | `UPDATE whatsapp_templates SET status, rejectionReason WHERE meta_template_id = …` |

**Lookup org:**

```ts
const row = await db.query.orgIntegrationCredentials.findFirst({
  where: and(
    eq(orgIntegrationCredentials.provider, 'whatsapp'),
    eq(orgIntegrationCredentials.phoneNumberId, metadata.phone_number_id),
    eq(orgIntegrationCredentials.status, 'active'),
  ),
})
```

Responder **200 rápido**; trabajo pesado puede quedar inline en v1 (volumen bajo).

**Referencia de patrón entrante:** `app/api/webhooks/resend/route.ts` (verificación Svix) — Meta usa HMAC distinto pero la idea es la misma.

---

## 10. Envío de plantillas

**Módulo:** `lib/whatsapp/send-template.ts`

```ts
export type SendWhatsAppTemplateParams = {
  organizationId: string
  toE164: string              // +573001234567 — normalizar con libphonenumber-js
  templateName: string
  languageCode?: string       // default 'es'
  bodyVariables?: string[]    // orden = {{1}}, {{2}}, … en body Meta
  sessionId?: string
  templateId?: string         // FK local opcional
}

export async function sendWhatsAppTemplate(params: SendWhatsAppTemplateParams): Promise<{ metaMessageId?: string }>
```

**Pasos:**

1. Cargar integración activa `provider = 'whatsapp'`.
2. Descifrar `accessToken`.
3. `POST https://graph.facebook.com/{version}/{phone_number_id}/messages`
4. `to`: dígitos sin `+` (validar formato Meta).
5. Insert en `whatsapp_messages`; unique en `meta_message_id` evita duplicados en reintentos.
6. Errores Meta → `status: failed`, log, **no throw** si se llama desde completion (solo log + registro).

**Categoría MVP:** preferir plantillas **UTILITY** (confirmación post-formulario). MARKETING exige opt-in explícito.

---

## 11. Config por flow (connectors)

### Decisión explícita

En el repo conviven:

- Tabla `webhooks` → URLs HTTP salientes
- Columnas `flows.outreachColdEmail*` → outreach
- `flows.settings` JSONB → presentación / runtime (`transition_style`, `tone`, …)

**WhatsApp v1 → `flows.settings.whatsapp`** (merge en PATCH existente), por analogía con tono/transiciones y bajo acoplamiento.

### Shape en JSONB

```ts
// flows.settings.whatsapp
{
  enabled: boolean
  templateName: string | null      // nombre Meta aprobado
  templateLanguage?: string        // default 'es'
  /** Mapeo de variables {{1}}, {{2}}… a claves del payload de completion */
  variableKeys: Array<
    | 'contact.name'
    | 'contact.phone'
    | 'contact.email'
    | 'result.summary'
    | 'result.classification'
    | 'result.score'
    | 'flow.name'
  >
  /** Solo enviar si classification cumple (opcional) */
  minClassification?: 'hot' | 'warm' | null
}
```

### PATCH flow

Extender `SettingsPatchSchema` en `app/api/flows/[flowId]/route.ts`:

```ts
whatsapp: z.object({
  enabled: z.boolean(),
  templateName: z.string().max(512).nullable(),
  templateLanguage: z.string().max(10).optional(),
  variableKeys: z.array(z.enum([...])).max(10).optional(),
  minClassification: z.enum(['hot', 'warm']).nullable().optional(),
}).optional()
```

**UI:** nueva sección en `connectors-form.tsx` (junto Resend / webhooks): toggle, select de plantilla aprobada, preview de variables.

**Alternativa futura:** si la config crece (múltiples reglas, A/B), migrar a columnas dedicadas o tabla `flow_whatsapp_rules` — no en v1.

---

## 12. Disparo al completar sesión

**Archivo:** `lib/session-completion.ts` — función `processSessionCompletion` (tras insertar `results`, junto a webhooks y `notifyOrgUsersInstantLeadAlerts`).

**Nuevo módulo:** `lib/whatsapp/on-session-complete.ts`

```ts
export async function sendWhatsAppOnSessionComplete(args: {
  organizationId: string
  flowId: string
  flowName: string
  sessionId: string
  settings: unknown
  contact: { name?: string; email?: string; phone?: string }
  result: {
    summary: string
    classification: string | null
    score: number | null
  } | null
}): Promise<void>
```

**Lógica:**

1. Parsear `settings.whatsapp`; si `!enabled` o `!templateName` → return.
2. Si `minClassification` y no cumple → return.
3. Si `!contact.phone` → log warn, return.
4. Normalizar teléfono a E.164 (`lib/phone-e164.ts` o helper sobre `libphonenumber-js`).
5. Resolver `bodyVariables` desde `variableKeys`.
6. Comprobar integración workspace conectada y plantilla `APPROVED` (cache o query).
7. `sendWhatsAppTemplate({ …, sessionId })`.
8. **Idempotencia:** antes de enviar, comprobar si ya existe `whatsapp_messages` outbound para `sessionId` + `templateName` → skip.

**Importante:** el contacto **no** es columna en `sessions`; usar el objeto `contact` ya calculado por `extractLeadContact()` en el mismo bloque donde hoy se llama a `notifyOrgUsersInstantLeadAlerts`.

**No ejecutar** si `replace === true` (recálculo de análisis), igual que webhooks skip en recalculate.

---

## 13. Plantillas WhatsApp (Fase 3)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/settings/integrations/whatsapp/templates` | Listar locales + sync status |
| `POST` | `/api/settings/integrations/whatsapp/templates` | Crear en Meta + insert PENDING |
| `POST` | `/api/settings/integrations/whatsapp/templates/sync` | Pull desde Meta (opcional) |

Webhook `message_template_status_update` actualiza `APPROVED` / `REJECTED`.

**v1 mínimo:** el cliente crea plantillas en Meta Business Manager y solo **selecciona** nombre aprobado en connectors; creación desde Dilo puede ser Fase 3.

---

## 14. UI

### Integraciones (`/dashboard/settings/integrations`)

- Reemplazar card WhatsApp “Próximamente” por flujo real (como `ResendIntegrationCard`).
- Estados: desconectado · conectando · conectado · error.
- Mostrar `displayPhone`, link a doc de pre-requisitos.

### Connectors (`/dashboard/flows/[flowId]/connectors`)

- Sección “WhatsApp al completar” con dependencia de integración workspace conectada.
- Si no conectado → link a integraciones.

### Mensajes (Fase 4 / opcional)

- Tab `/dashboard/settings/integrations/whatsapp/messages` o filtro en resultados — baja prioridad.

---

## 15. Variables de entorno

Añadir a `lib/env.ts` (opcionales hasta activar feature; rutas WhatsApp validan en runtime):

```env
# Meta / WhatsApp (servidor)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# Meta / WhatsApp (cliente — NEXT_PUBLIC_*)
NEXT_PUBLIC_FACEBOOK_APP_ID=
NEXT_PUBLIC_FACEBOOK_CONFIG_ID=

# Ya existente — NO duplicar
DILO_INTEGRATION_SECRETS_KEY=
NEXT_PUBLIC_APP_URL=https://getdilo.io
```

**Webhook URL en Meta:** `{NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp` — nunca `dilo.app`.

---

## 16. Roadmap por fases

| Fase | Entregables | Prioridad |
|------|-------------|-----------|
| **1 — Conectar** | Migración schema · extender crypto · Embedded Signup UI + `POST connect` · GET/DELETE estado | Alta |
| **2 — Enviar + webhook** | `sendWhatsAppTemplate` · webhook GET/POST firmado · `whatsapp_messages` · lookup `phone_number_id` | Alta |
| **3 — Producto** | `flows.settings.whatsapp` · UI connectors · hook `sendWhatsAppOnSessionComplete` · idempotencia | Alta |
| **4 — Plantillas UI** | CRUD plantillas · sync status Meta | Media |
| **5 — Extras** | Inbox inbound · conversación 24h · límites por plan · renovación token | Baja |

**MVP comercial = Fases 1–3.**

---

## 17. QA y criterios de aceptación

### Fase 1

- [ ] Owner/admin puede conectar; member no.
- [ ] Tras conectar, GET muestra `displayPhone` y `connected: true`.
- [ ] DELETE desconecta y webhook deja de resolver org (phoneNumberId null).
- [ ] Token nunca aparece en respuestas API ni logs sin redacción.

### Fase 2

- [ ] Webhook GET verifica challenge con token correcto.
- [ ] POST sin firma válida → 403.
- [ ] Status `delivered` / `read` actualiza fila por `meta_message_id`.
- [ ] Envío de prueba a número Meta test registra fila en `whatsapp_messages`.

### Fase 3

- [ ] Flow con `whatsapp.enabled` + plantilla + teléfono en sesión → outbound al completar.
- [ ] Flow sin teléfono → no error, solo log.
- [ ] Completar sesión no espera WhatsApp (tiempo de respuesta al visitante igual que hoy).
- [ ] Reintentar completion no duplica mensaje (idempotencia por sessionId).
- [ ] Recalcular análisis (`replace: true`) no reenvía WhatsApp.
- [ ] `minClassification: hot` filtra correctamente.

### Regresión

- [ ] Resend sigue funcionando (crypto Resend intacto).
- [ ] Webhooks salientes `X-Dilo-Signature` sin cambios.

---

## 18. Compliance, costos y riesgos

**Costos Meta:** conversaciones iniciadas por negocio (plantillas) ~USD 0.05–0.08; ventana 24h iniciada por usuario más barata. Los paga el **cliente** vía su WABA, no Dilo.

**Compliance:**

- MARKETING → opt-in documentado.
- Guardar origen del teléfono (paso del flow + timestamp en sesión).
- Política de retención para `raw_payload` (PII).

**Riesgos:**

| Riesgo | Mitigación |
|--------|------------|
| App Review Meta pendiente | Modo dev + números de prueba; doc clara al cliente |
| Token expira | `tokenExpiresAt` + UI “Reconectar”; refresh según doc Meta |
| Embedded Signup mal implementado | Seguir doc Embedded Signup; no OAuth `/me/businesses` |
| Plan free abusa envíos | Fase 5: gate `canSendWhatsApp(org.plan)` en send-template |
| Migración prod olvidada | Mismo playbook que `0004_org_integration_credentials` |

---

## Apéndice A — Ejemplo payload Graph (template)

```json
{
  "messaging_product": "whatsapp",
  "to": "573001234567",
  "type": "template",
  "template": {
    "name": "dilo_session_confirm",
    "language": { "code": "es" },
    "components": [{
      "type": "body",
      "parameters": [
        { "type": "text", "text": "María" },
        { "type": "text", "text": "Gracias por completar el formulario…" }
      ]
    }]
  }
}
```

---

## Apéndice B — Verificación firma webhook (referencia)

```ts
import { createHmac, timingSafeEqual } from 'crypto'

function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
  } catch {
    return false
  }
}
```

---

*Dudas de producto: Cristobal. Implementación: seguir `docs/SPRINT1.md` y README §5–§7 para patrones API.*
