-- Integraciones por org (Resend, etc.). Alinear con `orgIntegrationCredentials` en db/schema.ts
CREATE TABLE IF NOT EXISTS "org_integration_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "encrypted_payload" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "org_integration_org_idx" ON "org_integration_credentials" ("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "org_integration_org_provider_uidx" ON "org_integration_credentials" ("organization_id", "provider");
