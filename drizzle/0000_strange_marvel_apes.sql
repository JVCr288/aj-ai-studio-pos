CREATE TABLE "asset_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"source_asset_id" text NOT NULL,
	"category" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"storage_provider" text DEFAULT 'DEV_LOCAL' NOT NULL,
	"storage_key" text NOT NULL,
	"upload_status" text DEFAULT 'READY' NOT NULL,
	"source_project_id" text NOT NULL,
	"source_submission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ar_upload_status_check" CHECK ("upload_status" IN ('READY', 'PENDING', 'FAILED'))
);
--> statement-breakpoint
CREATE TABLE "booking_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"source_package_id" text NOT NULL,
	"name" text NOT NULL,
	"price" bigint NOT NULL,
	"currency" text DEFAULT 'MMK' NOT NULL,
	"deposit_type" text NOT NULL,
	"deposit_value" bigint,
	"refundable_policy" text,
	"session_duration_minutes" integer NOT NULL,
	"included_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retouched_photo_count" integer,
	"description" text,
	"notes" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"source_submission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bp_deposit_type_check" CHECK ("deposit_type" IN ('NONE', 'FIXED', 'PERCENTAGE'))
);
--> statement-breakpoint
CREATE TABLE "booking_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"opening_time" text NOT NULL,
	"closing_time" text NOT NULL,
	"default_session_duration_minutes" integer NOT NULL,
	"buffer_minutes" integer NOT NULL,
	"closed_days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_advance_booking_days" integer NOT NULL,
	"same_day_booking" boolean DEFAULT false NOT NULL,
	"reschedule_policy" text NOT NULL,
	"cancellation_policy" text NOT NULL,
	"deposit_refund_policy" text NOT NULL,
	"source_submission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_rules_studio_id_unique" UNIQUE("studio_id")
);
--> statement-breakpoint
CREATE TABLE "integration_operation_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_run_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"operation_id" text NOT NULL,
	"operation_type" text NOT NULL,
	"target_key" text NOT NULL,
	"source_id" text NOT NULL,
	"status" text DEFAULT 'STAGED' NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ior_status_check" CHECK ("status" IN ('STAGED', 'APPLIED', 'FAILED'))
);
--> statement-breakpoint
CREATE TABLE "integration_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" text NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"studio_id" uuid,
	"project_id" text NOT NULL,
	"approved_submission_id" text NOT NULL,
	"submission_version" integer NOT NULL,
	"schema_version" text NOT NULL,
	"mapper_version" text NOT NULL,
	"status" text NOT NULL,
	"operation_count" integer NOT NULL,
	"actor_user_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_runs_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "ir_status_check" CHECK ("status" IN ('STARTED', 'COMMITTED', 'ROLLED_BACK', 'FAILED'))
);
--> statement-breakpoint
CREATE TABLE "invoice_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"use_studio_profile" boolean DEFAULT true NOT NULL,
	"studio_name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"logo_asset_id" uuid,
	"business_info" text,
	"tax_info" text,
	"footer_message" text,
	"source_submission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_profiles_studio_id_unique" UNIQUE("studio_id")
);
--> statement-breakpoint
CREATE TABLE "payment_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"default_deposit_type" text NOT NULL,
	"default_deposit_value" bigint,
	"default_refundable_policy" text,
	"remaining_balance_timing" text DEFAULT 'UPON_SESSION_START' NOT NULL,
	"source_submission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_configurations_studio_id_unique" UNIQUE("studio_id")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_config_id" uuid NOT NULL,
	"source_payment_method_id" text NOT NULL,
	"provider" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"account_name" text,
	"account_identifier" text,
	"qr_asset_id" uuid,
	"notes" text,
	"source_submission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pm_provider_check" CHECK ("provider" IN ('KBZPAY', 'WAVEPAY', 'AYA_PAY', 'BANK_TRANSFER', 'CASH', 'OTHER'))
);
--> statement-breakpoint
CREATE TABLE "production_studios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_studio_id" text,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'APPROVED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_studios_legacy_studio_id_unique" UNIQUE("legacy_studio_id"),
	CONSTRAINT "production_studios_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "studio_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"name" text NOT NULL,
	"logo_asset_id" uuid,
	"address" text NOT NULL,
	"google_maps_url" text,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"facebook_url" text,
	"telegram_contact" text,
	"other_contact" text,
	"opening_hours" text,
	"closed_days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_project_id" text NOT NULL,
	"source_submission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_profiles_studio_id_unique" UNIQUE("studio_id")
);
--> statement-breakpoint
CREATE TABLE "studio_space_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"role" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ssa_role_check" CHECK ("role" IN ('ROOM_PHOTO', 'FLOOR_PLAN', 'ROUGH_SKETCH'))
);
--> statement-breakpoint
CREATE TABLE "studio_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"source_space_id" text NOT NULL,
	"name" text NOT NULL,
	"primary_use" text NOT NULL,
	"approximate_size" text,
	"floor_plan_asset_id" uuid,
	"sketch_asset_id" uuid,
	"notes" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"source_submission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_records" ADD CONSTRAINT "asset_records_studio_id_production_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."production_studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_studio_id_production_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."production_studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_rules" ADD CONSTRAINT "booking_rules_studio_id_production_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."production_studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_operation_records" ADD CONSTRAINT "integration_operation_records_integration_run_id_integration_runs_id_fk" FOREIGN KEY ("integration_run_id") REFERENCES "public"."integration_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_runs" ADD CONSTRAINT "integration_runs_studio_id_production_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."production_studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_profiles" ADD CONSTRAINT "invoice_profiles_studio_id_production_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."production_studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_profiles" ADD CONSTRAINT "invoice_profiles_logo_asset_id_asset_records_id_fk" FOREIGN KEY ("logo_asset_id") REFERENCES "public"."asset_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_configurations" ADD CONSTRAINT "payment_configurations_studio_id_production_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."production_studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_payment_config_id_payment_configurations_id_fk" FOREIGN KEY ("payment_config_id") REFERENCES "public"."payment_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_qr_asset_id_asset_records_id_fk" FOREIGN KEY ("qr_asset_id") REFERENCES "public"."asset_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_profiles" ADD CONSTRAINT "studio_profiles_studio_id_production_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."production_studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_profiles" ADD CONSTRAINT "studio_profiles_logo_asset_id_asset_records_id_fk" FOREIGN KEY ("logo_asset_id") REFERENCES "public"."asset_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_space_assets" ADD CONSTRAINT "studio_space_assets_space_id_studio_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."studio_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_space_assets" ADD CONSTRAINT "studio_space_assets_asset_id_asset_records_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_spaces" ADD CONSTRAINT "studio_spaces_studio_id_production_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."production_studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_spaces" ADD CONSTRAINT "studio_spaces_floor_plan_asset_id_asset_records_id_fk" FOREIGN KEY ("floor_plan_asset_id") REFERENCES "public"."asset_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_spaces" ADD CONSTRAINT "studio_spaces_sketch_asset_id_asset_records_id_fk" FOREIGN KEY ("sketch_asset_id") REFERENCES "public"."asset_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_records_studio_source_asset_idx" ON "asset_records" USING btree ("studio_id","source_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_packages_studio_source_pkg_idx" ON "booking_packages" USING btree ("studio_id","source_package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_op_records_run_seq_idx" ON "integration_operation_records" USING btree ("integration_run_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_runs_idempotency_idx" ON "integration_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_config_source_pm_idx" ON "payment_methods" USING btree ("payment_config_id","source_payment_method_id");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_space_assets_space_asset_role_idx" ON "studio_space_assets" USING btree ("space_id","asset_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_spaces_studio_source_space_idx" ON "studio_spaces" USING btree ("studio_id","source_space_id");