-- Permite el mismo Clerk user en varias orgs (futuro); hoy un usuario suele tener una fila por workspace.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_clerk_id_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_org_clerk_uidx" ON "users" ("organization_id", "clerk_id");
