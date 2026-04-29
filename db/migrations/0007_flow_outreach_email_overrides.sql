ALTER TABLE "flows" ADD COLUMN IF NOT EXISTS "outreach_cold_email_body_markdown" text;
ALTER TABLE "flows" ADD COLUMN IF NOT EXISTS "outreach_cold_email_cta_label" text;

ALTER TABLE "outreach_emails" ADD COLUMN IF NOT EXISTS "flow_id" uuid REFERENCES "flows"("id") ON DELETE SET NULL;
