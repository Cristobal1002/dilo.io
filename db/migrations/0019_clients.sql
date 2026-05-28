-- Clients (empresas) por workspace para soporte/informes.

CREATE TABLE IF NOT EXISTS "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "clients_org_slug_uidx" ON "clients" ("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "clients_org_name_idx" ON "clients" ("organization_id", "name");

ALTER TABLE "support_cases"
  ADD COLUMN IF NOT EXISTS "client_id" uuid REFERENCES "clients"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "support_cases_org_client_idx" ON "support_cases" ("organization_id", "client_id");

