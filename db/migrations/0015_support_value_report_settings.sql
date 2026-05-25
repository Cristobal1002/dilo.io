ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "support_contract_prompt" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "support_hourly_rate_usd" real;
