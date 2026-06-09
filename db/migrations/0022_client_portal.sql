ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "logo_url" text;

ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "reported_priority" text;
UPDATE "support_cases" SET "reported_priority" = "priority" WHERE "reported_priority" IS NULL;
ALTER TABLE "support_cases" ALTER COLUMN "reported_priority" SET DEFAULT 'medium';
ALTER TABLE "support_cases" ALTER COLUMN "reported_priority" SET NOT NULL;

ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "client_notes" text;

CREATE TABLE IF NOT EXISTS "client_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "invited_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "client_invites_client_email_idx"
  ON "client_invitations" ("client_id", "email");

CREATE INDEX IF NOT EXISTS "client_invites_pending_idx"
  ON "client_invitations" ("client_id", "accepted_at", "revoked_at");

CREATE TABLE IF NOT EXISTS "client_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "clerk_id" text NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "role" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "client_members_client_clerk_uidx"
  ON "client_members" ("client_id", "clerk_id");

CREATE INDEX IF NOT EXISTS "client_members_clerk_idx"
  ON "client_members" ("clerk_id");
