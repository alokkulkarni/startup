ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(255);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" varchar(255);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_price_id" varchar(255);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_tier" varchar(50) DEFAULT 'free' NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "period_start" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "period_end" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_idx" ON "subscriptions" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_idx" ON "subscriptions" ("stripe_subscription_id");
