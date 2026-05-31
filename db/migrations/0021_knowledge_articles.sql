-- Artículos de conocimiento (deflexión IA antes de soporte)

CREATE TABLE IF NOT EXISTS "knowledge_articles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "client_id" uuid REFERENCES "clients"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "status" text NOT NULL DEFAULT 'published',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "knowledge_articles_org_idx" ON "knowledge_articles" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "knowledge_articles_org_client_idx" ON "knowledge_articles" ("organization_id", "client_id");
