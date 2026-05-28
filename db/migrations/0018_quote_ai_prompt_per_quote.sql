ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "ai_prompt" text;

ALTER TABLE "organizations" DROP COLUMN IF EXISTS "default_quote_notes";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "quote_ai_prompt";
