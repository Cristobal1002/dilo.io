# Equipo — invitaciones y permisos

El workspace vive **solo en Neon** (`organizations` + `users`). Clerk autentica usuarios; **no usamos Clerk Organizations**.

## Configuración en Clerk (una vez)

1. **Organizations** → desactivar o dejar en *Membership optional* / *Personal accounts*, para que el registro no pida crear org ni logo.
2. **Webhooks** → `https://getdilo.io/api/webhooks/clerk` (o tunnel local):
   - `user.created` (aplica invitaciones pendientes por email)
3. Variable: `CLERK_WEBHOOK_SECRET`

## Invitaciones (Dilo)

- Tabla `organization_invitations` (token, email, rol, caducidad 14 días).
- Correo con enlace `/invite/{token}` (requiere `RESEND_API_KEY` + `RESEND_FROM_EMAIL` en el servidor).
- En **local**, si `RESEND_FROM_EMAIL` usa `@getdilo.io` sin verificar, el servidor usa `onboarding@resend.dev` automáticamente.
- Resend en modo prueba **solo envía al email de tu cuenta** (p. ej. `cristobal1002@gmail.com`). Para invitar a otros en local, la UI muestra el **enlace para copiar** (`/invite/{token}`).
- En **producción**, verifica `getdilo.io` en [resend.com/domains](https://resend.com/domains) para enviar a cualquier correo.
- Si el correo falla (salvo modo prueba anterior), **no** queda invitación huérfana en BD. Reintentar reenvía el mismo enlace si ya había una pendiente.
- Al registrarse o iniciar sesión con el mismo email, se acepta la invitación automáticamente.

## Logo del workspace

- Subida en **Configuración → Organización** vía **Uploadthing** (no pegar URL).
- Tamaño recomendado: **400×120 px**, horizontal (proporción 2:1–6:1), máx. 2 MB.
- La URL del CDN se guarda en `organizations.logo_url` (Neon no almacena el binario; igual que usar Supabase Storage con una columna URL).

Variables:

```env
UPLOADTHING_TOKEN=...
# opcional: UPLOADTHING_APP_ID
```

## Roles en Dilo

| Rol Dilo | Permisos |
|----------|----------|
| `owner` | Todo, invitar/quitar, plan y facturación |
| `admin` | Integraciones, organización, flows y respuestas |
| `member` | Flows y respuestas (sin integraciones ni plan) |

## Migración de cuentas antiguas

Si `organizations.slug` era un id de Clerk Organization, sigue funcionando: el usuario se resuelve por filas en `users`, no por la sesión de Clerk.

## API

- `GET /api/settings/team` — miembros + invitaciones pendientes + límites
- `POST /api/settings/team/invite` — `{ email, role: "admin" | "member" }` (solo owner)
- `DELETE /api/settings/team/members/:memberId` — quitar miembro (solo owner)
- `DELETE /api/settings/team/invitations/:invitationId` — revocar invitación (solo owner)
- `GET /api/invitations/:token` — vista previa pública de la invitación
- `POST /api/invitations/:token/accept` — aceptar (usuario autenticado)

## Límites por plan

Cuentan miembros en BD + invitaciones pendientes en Dilo (`membersLimit` en tabla `plans`).
