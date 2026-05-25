ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "client_company" text;

CREATE INDEX IF NOT EXISTS "support_cases_org_company_idx" ON "support_cases" ("organization_id", "client_company");
