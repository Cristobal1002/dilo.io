-- WhatsApp Business API: columnas en integraciones + tablas de plantillas y mensajes

ALTER TABLE "org_integration_credentials"
  ADD COLUMN IF NOT EXISTS "phone_number_id" text,
  ADD COLUMN IF NOT EXISTS "waba_id" text,
  ADD COLUMN IF NOT EXISTS "display_phone" text,
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "token_expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "last_error" text;

CREATE UNIQUE INDEX IF NOT EXISTS "org_integration_whatsapp_phone_uidx"
  ON "org_integration_credentials" ("phone_number_id")
  WHERE "provider" = 'whatsapp' AND "phone_number_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "language" text DEFAULT 'es' NOT NULL,
  "category" text NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "components" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "meta_template_id" text,
  "rejection_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "wa_templates_org_idx" ON "whatsapp_templates" ("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "wa_templates_org_name_lang_uidx"
  ON "whatsapp_templates" ("organization_id", "name", "language");

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "session_id" uuid REFERENCES "sessions"("id") ON DELETE set null,
  "direction" text NOT NULL,
  "to_number" text,
  "from_number" text,
  "template_id" uuid REFERENCES "whatsapp_templates"("id") ON DELETE set null,
  "template_name" text,
  "template_vars" jsonb,
  "status" text DEFAULT 'sent' NOT NULL,
  "meta_message_id" text,
  "error_code" text,
  "error_message" text,
  "raw_payload" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "wa_messages_org_idx" ON "whatsapp_messages" ("organization_id");
CREATE INDEX IF NOT EXISTS "wa_messages_session_idx" ON "whatsapp_messages" ("session_id");
CREATE UNIQUE INDEX IF NOT EXISTS "wa_messages_meta_id_uidx"
  ON "whatsapp_messages" ("meta_message_id")
  WHERE "meta_message_id" IS NOT NULL;
