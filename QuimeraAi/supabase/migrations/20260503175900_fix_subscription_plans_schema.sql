-- Fix subscription_plans table to match the plansService column naming convention
-- Add missing columns for the full plansService migration

-- Add columns that may not exist yet
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_monthly numeric DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_annually numeric DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_id text;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_annually text;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS color text DEFAULT '#6b7280';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS icon text DEFAULT 'Sparkles';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS show_in_landing boolean DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS landing_order integer DEFAULT 99;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS limits jsonb DEFAULT '{}';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{}';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_by text;
