-- Permite alta directa de usuarios del portal (sin Clerk id hasta el primer login).
ALTER TABLE "client_members" ALTER COLUMN "clerk_id" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "client_members_client_email_uidx"
  ON "client_members" ("client_id", "email");
