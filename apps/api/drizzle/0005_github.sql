CREATE TABLE IF NOT EXISTS "github_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "github_user_id" integer NOT NULL,
  "github_login" text NOT NULL,
  "github_name" text,
  "github_avatar_url" text,
  "encrypted_token" text NOT NULL,
  "token_scope" text NOT NULL DEFAULT 'repo,read:user',
  "connected_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "github_connections_user_id_unique" UNIQUE("user_id")
);

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "github_repo_url" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "github_repo_owner" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "github_repo_name" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "github_default_branch" text DEFAULT 'main';
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "github_last_pushed_sha" text;
