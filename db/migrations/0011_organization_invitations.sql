CREATE TABLE IF NOT EXISTS "organization_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "invited_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "org_invites_org_email_idx"
  ON "organization_invitations" ("organization_id", "email");

CREATE INDEX IF NOT EXISTS "org_invites_pending_idx"
  ON "organization_invitations" ("organization_id", "accepted_at", "revoked_at");
