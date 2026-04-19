-- Una respuesta por paso y sesión (upsert desde la API pública).
CREATE UNIQUE INDEX IF NOT EXISTS "answers_session_step_uidx" ON "answers" ("session_id", "step_id");
