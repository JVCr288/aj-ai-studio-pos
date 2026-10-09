CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token_hash" text NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"role" text NOT NULL,
	"csrf_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_session_token_hash_unique" UNIQUE("session_token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'STUDIO_ADMIN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"tenant_id" text NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"actor_id" text NOT NULL,
	"actor_role" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_reference" varchar(100) NOT NULL,
	"tenant_id" text DEFAULT 'aj-ai-studio' NOT NULL,
	"studio_id" uuid,
	"idempotency_key" varchar(255) NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"telegram_handle" text,
	"package_snapshot" jsonb NOT NULL,
	"space_snapshot" jsonb NOT NULL,
	"start_date" text NOT NULL,
	"time_slot" text NOT NULL,
	"total_amount" bigint NOT NULL,
	"deposit_amount" bigint NOT NULL,
	"verified_paid_amount" bigint DEFAULT 0 NOT NULL,
	"outstanding_balance" bigint NOT NULL,
	"currency" text DEFAULT 'MMK' NOT NULL,
	"booking_status" text DEFAULT 'AWAITING_PAYMENT_REVIEW' NOT NULL,
	"payment_status" text DEFAULT 'EVIDENCE_RECEIVED' NOT NULL,
	"payment_method" text DEFAULT 'KBZPay' NOT NULL,
	"uploaded_slip_name" text,
	"uploaded_slip_size" text,
	"payment_evidence_asset_id" text,
	"customer_notes" text,
	"private_admin_notes" text,
	"source_channel" text DEFAULT 'WEB_CUSTOMER_PORTAL' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"cancellation_reason" text,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_bookings_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "cb_booking_status_check" CHECK ("booking_status" IN ('SUBMITTED', 'AWAITING_PAYMENT_REVIEW', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
	CONSTRAINT "cb_payment_status_check" CHECK ("payment_status" IN ('NOT_REQUIRED', 'PENDING', 'EVIDENCE_RECEIVED', 'VERIFIED', 'REJECTED', 'REFUNDED', 'PARTIALLY_REFUNDED'))
);
--> statement-breakpoint
CREATE TABLE "pos_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"report_id" text NOT NULL,
	"terminal_id" text NOT NULL,
	"staff_id" text,
	"staff_name" text NOT NULL,
	"status" text DEFAULT 'CLOSED' NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"starting_float_mmk" integer DEFAULT 0 NOT NULL,
	"cash_sales_mmk" integer DEFAULT 0 NOT NULL,
	"expected_cash_mmk" integer DEFAULT 0 NOT NULL,
	"actual_counted_cash_mmk" integer,
	"discrepancy_mmk" integer DEFAULT 0 NOT NULL,
	"discrepancy_type" text,
	"cash_movements" jsonb,
	"z_report_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_staff" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"myanmar_name" text,
	"role" text NOT NULL,
	"pin_hash" text NOT NULL,
	"badge_barcode_hash" text,
	"avatar_color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"terminal_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"order_reference" text NOT NULL,
	"lines" jsonb NOT NULL,
	"subtotal_mmk" integer NOT NULL,
	"discount_mmk" integer DEFAULT 0 NOT NULL,
	"total_due_mmk" integer NOT NULL,
	"payments" jsonb NOT NULL,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"client_created_at" timestamp with time zone,
	"server_received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verified_slips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"gateway" text NOT NULL,
	"transaction_id" text NOT NULL,
	"amount_mmk" integer NOT NULL,
	"transferred_at" timestamp with time zone,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_assets" DROP CONSTRAINT "oa_upload_status_check";--> statement-breakpoint
DROP INDEX "onboarding_assets_proj_asset_idx";--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_customer_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."customer_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_bookings" ADD CONSTRAINT "customer_bookings_studio_id_production_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."production_studios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_tenant_username_idx" ON "admin_users" USING btree ("tenant_id","username");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_bookings_tenant_ref_idx" ON "customer_bookings" USING btree ("tenant_id","booking_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_bookings_idempotency_idx" ON "customer_bookings" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_shifts_tenant_report_idx" ON "pos_shifts" USING btree ("tenant_id","report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_staff_tenant_id_idx" ON "pos_staff" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_transactions_tenant_id_idx" ON "pos_transactions" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "verified_slips_tenant_gw_tx_idx" ON "verified_slips" USING btree ("tenant_id","gateway","transaction_id");--> statement-breakpoint
ALTER TABLE "onboarding_assets" DROP COLUMN "created_at";