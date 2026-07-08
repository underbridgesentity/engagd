CREATE TABLE "org_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"organisation_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "membership_role" DEFAULT 'viewer' NOT NULL,
	"token" text NOT NULL,
	"invited_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"organisation_id" text NOT NULL,
	"plan_tier" "plan_tier" NOT NULL,
	"billing_interval" "billing_interval" NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_reference" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"verification_result" jsonb,
	"verified_at" timestamp with time zone,
	"period_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_invites_org_email_idx" ON "org_invites" USING btree ("organisation_id","email");--> statement-breakpoint
CREATE INDEX "subscription_payments_org_idx" ON "subscription_payments" USING btree ("organisation_id");