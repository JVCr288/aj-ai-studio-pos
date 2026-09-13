CREATE TABLE "onboarding_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" text NOT NULL,
	"project_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"role" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_bucket" text DEFAULT 'onboarding-assets' NOT NULL,
	"storage_key" text NOT NULL,
	"checksum" text,
	"upload_status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oa_upload_status_check" CHECK ("upload_status" IN ('PENDING', 'READY', 'FAILED', 'REMOVED'))
);
--> statement-breakpoint
CREATE TABLE "onboarding_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"draft_revision" integer DEFAULT 1 NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_drafts_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "onboarding_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"schema_id" text DEFAULT 'photo-studio-v1' NOT NULL,
	"schema_version" text DEFAULT '1.0' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"studio_display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "op_status_check" CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'INTEGRATED'))
);
--> statement-breakpoint
CREATE TABLE "onboarding_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"version" integer NOT NULL,
	"source_draft_revision" integer NOT NULL,
	"immutable_snapshot" jsonb NOT NULL,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	CONSTRAINT "os_status_check" CHECK ("status" IN ('SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'INTEGRATED'))
);
--> statement-breakpoint
CREATE TABLE "owner_access_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"status" text DEFAULT 'VALID' NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_access_links_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "oal_status_check" CHECK ("status" IN ('VALID', 'EXPIRED', 'REVOKED', 'ALREADY_SUBMITTED'))
);
--> statement-breakpoint
ALTER TABLE "onboarding_assets" ADD CONSTRAINT "onboarding_assets_project_id_onboarding_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."onboarding_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_drafts" ADD CONSTRAINT "onboarding_drafts_project_id_onboarding_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."onboarding_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_submissions" ADD CONSTRAINT "onboarding_submissions_project_id_onboarding_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."onboarding_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_access_links" ADD CONSTRAINT "owner_access_links_project_id_onboarding_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."onboarding_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_assets_proj_asset_idx" ON "onboarding_assets" USING btree ("project_id","asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_drafts_project_idx" ON "onboarding_drafts" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_submissions_proj_ver_idx" ON "onboarding_submissions" USING btree ("project_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "owner_access_links_token_hash_idx" ON "owner_access_links" USING btree ("token_hash");