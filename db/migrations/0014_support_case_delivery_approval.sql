ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "hours_spent" real;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "due_at" timestamp;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "client_approval_status" text;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "client_approval_token" text;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "client_feedback" text;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "submitted_for_approval_at" timestamp;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "client_responded_at" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "support_cases_approval_token_uidx"
  ON "support_cases" ("client_approval_token")
  WHERE "client_approval_token" IS NOT NULL;
