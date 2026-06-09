CREATE TABLE IF NOT EXISTS "client_portal_login_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "code_hash" text NOT NULL,
  "invite_token" text,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "client_portal_login_codes_email_idx"
  ON "client_portal_login_codes" ("email", "expires_at" DESC);
