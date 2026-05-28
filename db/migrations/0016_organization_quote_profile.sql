ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "legal_name" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "tax_id" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "billing_email" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "billing_phone" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "billing_address" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "billing_city" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "quote_prefix" text DEFAULT 'COT';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_quote_notes" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "quote_ai_prompt" text;
