CREATE TABLE "demo"."demo_sandboxes" (
	"sandbox_id" text PRIMARY KEY NOT NULL,
	"lead_id" uuid,
	"studio_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "demo"."demo_sandboxes" ADD CONSTRAINT "demo_sandboxes_lead_id_demo_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "demo"."demo_leads"("id") ON DELETE cascade ON UPDATE no action;