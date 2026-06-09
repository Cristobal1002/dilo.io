-- Plan de soporte visible en el portal de cliente.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "support_plan_tier" text DEFAULT 'business';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "support_hours_note" text;
