-- Sprint 2: Expand projects with template starter files seeding support
-- No schema changes needed (project_files already exists), just add subscriptions table

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "plan" text DEFAULT 'free' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("workspace_id")
);

CREATE INDEX IF NOT EXISTS "subscriptions_workspace_idx" ON "subscriptions"("workspace_id");
