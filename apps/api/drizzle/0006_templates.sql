CREATE TABLE IF NOT EXISTS "templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL DEFAULT 'other',
  "framework" text NOT NULL DEFAULT 'react',
  "files_json" jsonb NOT NULL DEFAULT '[]',
  "thumbnail_url" text,
  "use_count" integer NOT NULL DEFAULT 0,
  "avg_rating" numeric(3,2) NOT NULL DEFAULT 0,
  "rating_count" integer NOT NULL DEFAULT 0,
  "is_official" boolean NOT NULL DEFAULT false,
  "is_public" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "templates_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "template_ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "templates"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "template_ratings_user_template_unique" UNIQUE("template_id", "user_id")
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_step" integer NOT NULL DEFAULT 0;
