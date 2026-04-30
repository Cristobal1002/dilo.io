-- Resend delivery / bounce tracking for outreach cold emails
ALTER TABLE "outreach_emails"
  ADD COLUMN IF NOT EXISTS "resend_email_id" text,
  ADD COLUMN IF NOT EXISTS "resend_delivery_status" text,
  ADD COLUMN IF NOT EXISTS "resend_bounce_type" text,
  ADD COLUMN IF NOT EXISTS "resend_bounce_message" text,
  ADD COLUMN IF NOT EXISTS "resend_delivery_updated_at" timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS "outreach_emails_resend_email_id_uidx"
  ON "outreach_emails" ("resend_email_id")
  WHERE "resend_email_id" IS NOT NULL;
