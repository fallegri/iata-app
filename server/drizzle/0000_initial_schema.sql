CREATE TABLE "ai_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"encrypted_api_key" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_configs_teacher_id_unique" UNIQUE("teacher_id")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(6) NOT NULL,
	"name" varchar(150) NOT NULL,
	"teacher_name" varchar(100) NOT NULL,
	"teacher_email" varchar(254) NOT NULL,
	"owner_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"expected_students" integer DEFAULT 0,
	"emailjs_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "declarations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"student_id_number" varchar(20) NOT NULL,
	"student_name" varchar(100) NOT NULL,
	"student_group" varchar(20) NOT NULL,
	"career" varchar(100) NOT NULL,
	"subject" varchar(100) NOT NULL,
	"activity_type" varchar(20) NOT NULL,
	"used_ai" boolean NOT NULL,
	"ai_tool" varchar(100),
	"learnings" varchar(2000),
	"verification_method" varchar(1000),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_activity_type" CHECK ("declarations"."activity_type" IN ('tarea', 'proyecto'))
);
--> statement-breakpoint
CREATE TABLE "institution_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_teacher_institution" UNIQUE("teacher_id","institution_id"),
	CONSTRAINT "chk_membership_role" CHECK ("institution_memberships"."role" IN ('admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"code" varchar(8) NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teachers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_configs" ADD CONSTRAINT "ai_configs_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_teachers_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_memberships" ADD CONSTRAINT "institution_memberships_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_memberships" ADD CONSTRAINT "institution_memberships_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_teachers_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_courses_owner" ON "courses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_courses_institution" ON "courses" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_declarations_course" ON "declarations" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_declarations_submitted" ON "declarations" USING btree ("submitted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_declarations_student_name" ON "declarations" USING btree ("student_name");--> statement-breakpoint
CREATE INDEX "idx_declarations_student_id" ON "declarations" USING btree ("student_id_number");--> statement-breakpoint
CREATE INDEX "idx_memberships_teacher" ON "institution_memberships" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_memberships_institution" ON "institution_memberships" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_invite_codes_code" ON "invite_codes" USING btree ("code");