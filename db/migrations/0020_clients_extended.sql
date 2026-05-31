-- Clientes extendidos (LATAM) + contexto embed

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "legal_name" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "external_id" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "tax_id_type" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "tax_id" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "address_line1" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "address_line2" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "state_region" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "country_code" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "embed_allowed_domains" jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS "clients_org_external_id_uidx"
  ON "clients" ("organization_id", "external_id")
  WHERE "external_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "clients_org_tax_id_idx" ON "clients" ("organization_id", "tax_id");
