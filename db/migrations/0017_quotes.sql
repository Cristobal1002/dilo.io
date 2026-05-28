CREATE TABLE IF NOT EXISTS "quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "quote_number" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "flow_id" uuid REFERENCES "flows"("id") ON DELETE SET NULL,
  "session_id" uuid REFERENCES "sessions"("id") ON DELETE SET NULL,
  "client_name" text,
  "client_tax_id" text,
  "client_phone" text,
  "client_email" text,
  "issue_date" timestamp NOT NULL DEFAULT now(),
  "due_date" timestamp,
  "line_items" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "notes" text,
  "global_discount_percent" real NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "quotes_org_number_uidx" ON "quotes" ("organization_id", "quote_number");
CREATE INDEX IF NOT EXISTS "quotes_org_updated_idx" ON "quotes" ("organization_id", "updated_at");
