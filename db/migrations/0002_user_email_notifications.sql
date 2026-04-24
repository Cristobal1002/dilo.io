ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_notification_settings" jsonb DEFAULT '{"digest":"weekly","alertHot":false,"alertMinScore":null,"alertMaxPerDay":3}'::jsonb NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_digest_sent_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_stats" jsonb DEFAULT '{}'::jsonb NOT NULL;
