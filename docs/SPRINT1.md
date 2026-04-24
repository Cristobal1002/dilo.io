# Dilo — Sprint 1 (spec interna)

**Estado:** en implementación en repo.  
**Prioridad comercial:** estas piezas antes de outreach agresivo.

## Principios (corrige la spec genérica)

1. **Dominio canónico:** todo enlace público, iframe y snippet usan `NEXT_PUBLIC_APP_URL` (p. ej. `https://getdilo.io`). No hardcodear `dilo.app` ni otros hosts.
2. **Contrato `/acknowledge`:** el body usa `answeredStepQuestion` (texto del paso que el usuario acaba de responder) y `nextQuestion` (texto de la siguiente pregunta). El prompt del LLM debe citar los mismos nombres.
3. **Inserción del acuse:** tras `rebuildMessages(nextIdx, …)`, el último mensaje `assistant` es siempre la **nueva** pregunta. Se inserta el acuse **justo antes** de ese último `assistant`, solo si `nextIdx >= 1` (ya hubo al menos una pregunta respondida antes).
4. **Carreras en `advance`:** un `ref` evita dos avances simultáneos (doble tap / doble Enter).
5. **Email:** best-effort, sin `await` en la respuesta al visitante; si faltan `RESEND_*`, solo log, sin throw.
6. **Embed `postMessage`:** el listener en `embed.js` usa el **origin** derivado de `script.src` (el snippet debe usar URL absoluta al `embed.js` de nuestro dominio).

---

## Feature 2 — “Hecho con Dilo” (branding)

- **UI:** pie compacto bajo el área de interacción en `welcome`, `chat` y `done`.
- **Ocultar:** `flow.settings.hide_branding === true` (futuro Pro); por defecto visible.
- **Link:** `${NEXT_PUBLIC_APP_URL}/?ref=flow` (o `/sign-up` si preferís conversión; mantener una sola decisión en código).

---

## Feature 3 — Email al completar sesión (Resend)

- **Disparo:** al final de `processSessionCompletion` en `lib/session-completion.ts`, tras persistir `results` (y antes o después de webhooks; no bloquear).
- **Destinatario:** primer usuario `role = 'owner'` de `users` con `organizationId = flow.organizationId`. Si no hay email, log warning y no enviar.
- **Variables:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (dominio verificado en Resend).
- **Contenido:** texto plano MVP con link a `${NEXT_PUBLIC_APP_URL}/dashboard/flows/{flowId}/results/{sessionId}`.

---

## Feature 4 — Embed v1

- **`public/embed.js`:** lee `data-flow`, opcional `data-height` / `data-width`; `iframe.src = origin + '/f/' + flowId + '?embed=1'` con `origin` desde `new URL(script.src).origin`.
- **Página pública:** `app/f/[flowId]/page.tsx` pasa `isEmbed` si `searchParams.embed === '1'`.
- **Runner:** con `isEmbed`: sin header de progreso, sin toggle de tema en welcome/done; mantener branding pie; `postMessage` al padre `{ type: 'dilo:resize', flowId, height }` cuando cambien mensajes/fase.
- **Dashboard:** ítem “Código de embed” en menú ⋮ (`flow-editor.tsx`) + modal con snippet absoluto.
- **Seguridad MVP:** solo flows `published`; draft → mensaje claro (404 o pantalla en runner).

---

## Feature 1 — Tono + transiciones IA

- **Settings (JSONB, sin migración):**
  - `transition_style`: `'ai' | 'none'`. Default en runtime: `'none'` si ausente (flows viejos); flows **nuevos** generados por IA: `'ai'`.
  - `tone`: string, máx. ~200 chars, default `"cálido, breve y natural"`.
- **API:** `POST /api/f/[flowId]/acknowledge` — público, valida sesión + flow publicado, body Zod; si `transition_style !== 'ai'` devuelve `message: ''`; si error/timeout &lt; 3s → `message: ''`.
- **Modelo:** `gpt-4o-mini`, ~40 tokens, instrucciones acordadas (1 frase, sin repetir email/tel, etc.).
- **Cliente:** `advance` hace mínimo 400 ms de espera + fetch en paralelo; asincrónico con anti-carrera.
- **Builder:** panel en vista Presentación para editar tono + toggle transiciones; `PATCH` flow con merge de `settings`.

---

## Orden de implementación en repo

1. F2 branding + `lib/public-site.ts`  
2. F3 Resend + `session-completion`  
3. F4 embed + modal  
4. F1 acknowledge + UI + defaults generación  

---

## QA rápido (antes de merge)

- [ ] Branding oculto con `hide_branding`
- [ ] Email no bloquea completar sesión; sin keys no crashea
- [ ] Embed: snippet con URL absoluta; resize al crecer el chat
- [ ] `transition_style: none` → cero llamadas a `/acknowledge`
- [ ] Timeout acknowledge → flujo sigue sin mensaje extra
- [ ] Doble envío no duplica pasos

---

*Dudas de producto: Cristobal.*
