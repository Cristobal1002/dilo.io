ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "outreach_cold_email_body_markdown" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "outreach_cold_email_cta_label" text;
