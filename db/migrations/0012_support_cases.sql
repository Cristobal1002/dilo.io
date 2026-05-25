CREATE TABLE IF NOT EXISTS "support_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "case_number" integer NOT NULL,
  "flow_id" uuid REFERENCES "flows"("id") ON DELETE SET NULL,
  "session_id" uuid REFERENCES "sessions"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'new',
  "priority" text NOT NULL DEFAULT 'medium',
  "type" text NOT NULL DEFAULT 'support',
  "subject" text NOT NULL,
  "description" text,
  "requester_name" text,
  "requester_email" text,
  "requester_phone" text,
  "assigned_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "internal_notes" text,
  "resolution_notes" text,
  "last_activity_at" timestamp NOT NULL DEFAULT now(),
  "resolved_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "support_cases_org_status_idx" ON "support_cases" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "support_cases_org_activity_idx" ON "support_cases" ("organization_id", "last_activity_at");
CREATE UNIQUE INDEX IF NOT EXISTS "support_cases_org_number_uidx" ON "support_cases" ("organization_id", "case_number");
CREATE UNIQUE INDEX IF NOT EXISTS "support_cases_session_uidx" ON "support_cases" ("session_id") WHERE "session_id" IS NOT NULL;
