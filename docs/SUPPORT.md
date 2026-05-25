# Soporte (bandeja de casos)

MVP de casos por workspace, separado de Outreach y de resultados de captación.

## Flujo

1. Crea un flow desde la plantilla **Solicitud de soporte** (`/dashboard/flows/new` → Plantillas) o activa **Soporte** en Conectores del flow.
2. Publica el flow y comparte `/f/{flowId}`.
3. Al completar una sesión, se inserta un registro en `support_cases` (idempotente por `session_id`).
4. El equipo gestiona casos en **Biblioteca → Soporte** (`/dashboard/support`).

## Estados

`new` · `in_progress` · `waiting` · `resolved` · `closed`

## API

- `GET /api/support/cases` — listado (`status`, `assignee`, `q`, `flow`, `page`)
- `GET /api/support/cases/:caseId` — detalle
- `PATCH /api/support/cases/:caseId` — estado, prioridad, tipo, asignado, notas

## Migración

```bash
npm run db:push
```

Aplica `db/migrations/0012_support_cases.sql`.

## Mapeo desde el flow

Al completar la sesión, Dilo lee el **`variable_name`** de cada paso (en el editor del flow), no el texto visible de la pregunta.

### Dos conceptos distintos

| Concepto | Qué es | Campo en el caso | Variables típicas |
|----------|--------|------------------|-------------------|
| **Solicitante** | Persona que llena el formulario | `requester_name`, email, teléfono | `nombre_contacto`, `email_contacto`, `telefono_contacto` (bloque contacto de la plantilla) |
| **Empresa** | Organización donde trabaja esa persona (cliente para informes) | `client_company` | `empresa`, `compania`, `compañia`, `company`, `nombre_empresa` |

No mezcles ambos en un solo paso: el informe mensual agrupa por **empresa**; el contacto es quién escribió.

### Resto de campos

| Campo en el caso | Nombres de variable aceptados |
|------------------|-------------------------------|
| Asunto | `asunto`, `subject`, `titulo` |
| Descripción | `descripcion`, `description`, `detalle` |
| Tipo | `tipo_solicitud`, `tipo`, `type` |
| Urgencia | `urgencia`, `prioridad`, `priority` |

Si tu paso de empresa usa variable `compania`, se guarda bien aunque la pregunta diga «Cliente» en pantalla.

## Tiempo, entrega y aprobación del cliente

| Campo | Quién lo define | Uso |
|-------|-----------------|-----|
| `created_at` | Automático al crear el caso | **Fecha de solicitud** |
| `due_at` | Tu equipo en el panel | Fecha de entrega comprometida |
| `hours_spent` | Tu equipo | Horas dedicadas (base del informe de valor) |
| `resolution_notes` | Tu equipo | Qué entregaste (lo ve el cliente al aprobar) |

**Flujo de aprobación**

1. Trabajas el caso y guardas horas, entrega y notas de resolución.
2. **Pedir aprobación al cliente** → email (si hay correo) + enlace `/support/review/{token}`.
3. El solicitante puede: **Aprobar**, **Cancelar** o **Solicitar ajustes** (con comentario).
4. Si pide ajustes, el caso vuelve a *En curso*; cuando corrijas, reenvías a aprobación.

`POST /api/support/cases/:caseId/request-approval` — genera o reutiliza token y envía correo.

## Próximo (no incluido)

- Informe mensual de valor (horas + prompt de contrato)
- Prompt de contrato por workspace / por empresa
- SLA e ITIL
