CREATE TABLE "org_integration_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"encrypted_payload" text NOT NULL,
	"phone_number_id" text,
	"waba_id" text,
	"display_phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"token_expires_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"tracking_token" text NOT NULL,
	"subject" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"first_opened_at" timestamp,
	"open_count" integer DEFAULT 0 NOT NULL,
	"first_clicked_at" timestamp,
	"click_count" integer DEFAULT 0 NOT NULL,
	"last_clicked_url" text,
	"cta_destination_url" text,
	"flow_id" uuid,
	"resend_email_id" text,
	"resend_delivery_status" text,
	"resend_bounce_type" text,
	"resend_bounce_message" text,
	"resend_delivery_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_emails_tracking_token_unique" UNIQUE("tracking_token")
);
--> statement-breakpoint
CREATE TABLE "outreach_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_key" text NOT NULL,
	"company" text,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"last_activity_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"flows_limit" integer NOT NULL,
	"sessions_month_limit" integer NOT NULL,
	"members_limit" integer NOT NULL,
	"price_usd_monthly" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"session_id" uuid,
	"direction" text NOT NULL,
	"to_number" text,
	"from_number" text,
	"template_id" uuid,
	"template_name" text,
	"template_vars" jsonb,
	"status" text DEFAULT 'sent' NOT NULL,
	"meta_message_id" text,
	"error_code" text,
	"error_message" text,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"language" text DEFAULT 'es' NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta_template_id" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_clerk_id_unique";--> statement-breakpoint
ALTER TABLE "flows" ADD COLUMN "outreach_cold_email_body_markdown" text;--> statement-breakpoint
ALTER TABLE "flows" ADD COLUMN "outreach_cold_email_cta_label" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "outreach_cold_email_body_markdown" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "outreach_cold_email_cta_label" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "branch_label" text;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "branch_color" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notification_settings" jsonb DEFAULT '{"digest":"weekly","alertHot":false,"alertMinScore":null,"alertMaxPerDay":3}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_digest_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_stats" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "org_integration_credentials" ADD CONSTRAINT "org_integration_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_emails" ADD CONSTRAINT "outreach_emails_lead_id_outreach_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."outreach_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_emails" ADD CONSTRAINT "outreach_emails_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_leads" ADD CONSTRAINT "outreach_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_template_id_whatsapp_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."whatsapp_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_integration_org_idx" ON "org_integration_credentials" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_integration_org_provider_uidx" ON "org_integration_credentials" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "org_integration_whatsapp_phone_uidx" ON "org_integration_credentials" USING btree ("phone_number_id") WHERE "org_integration_credentials"."provider" = 'whatsapp' AND "org_integration_credentials"."phone_number_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "outreach_emails_lead_idx" ON "outreach_emails" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_emails_resend_email_id_uidx" ON "outreach_emails" USING btree ("resend_email_id") WHERE "outreach_emails"."resend_email_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "outreach_leads_org_status_idx" ON "outreach_leads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "outreach_leads_org_activity_idx" ON "outreach_leads" USING btree ("organization_id","last_activity_at");--> statement-breakpoint
CREATE INDEX "outreach_leads_org_deleted_idx" ON "outreach_leads" USING btree ("organization_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_leads_org_emailkey_uidx" ON "outreach_leads" USING btree ("organization_id","email_key");--> statement-breakpoint
CREATE INDEX "wa_messages_org_idx" ON "whatsapp_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "wa_messages_session_idx" ON "whatsapp_messages" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wa_messages_meta_id_uidx" ON "whatsapp_messages" USING btree ("meta_message_id") WHERE "whatsapp_messages"."meta_message_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "wa_templates_org_idx" ON "whatsapp_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wa_templates_org_name_lang_uidx" ON "whatsapp_templates" USING btree ("organization_id","name","language");--> statement-breakpoint
CREATE UNIQUE INDEX "users_org_clerk_uidx" ON "users" USING btree ("organization_id","clerk_id");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");