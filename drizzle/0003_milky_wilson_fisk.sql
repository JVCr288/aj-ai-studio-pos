CREATE SCHEMA IF NOT EXISTS "demo";
--> statement-breakpoint
CREATE TABLE "demo"."demo_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"sandbox_id" text NOT NULL,
	"event" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo"."demo_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"studio_name" text NOT NULL,
	"city" text,
	"contact_handle" text,
	"preferred_channel" text,
	"consent" boolean DEFAULT true NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	"source" text,
	"user_agent" text,
	CONSTRAINT "demo_leads_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "demo"."demo_activity" ADD CONSTRAINT "demo_activity_lead_id_demo_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "demo"."demo_leads"("id") ON DELETE cascade ON UPDATE no action;