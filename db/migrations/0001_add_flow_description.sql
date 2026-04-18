-- Añade descripción corta del flow (presentación / formulario).
ALTER TABLE "flows" ADD COLUMN IF NOT EXISTS "description" text;
