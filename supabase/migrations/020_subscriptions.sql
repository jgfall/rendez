-- Migration: Add subscription fields to profiles table
-- Enables SaaS subscription management with Stripe

-- Create subscription plan type enum
CREATE TYPE subscription_plan AS ENUM ('free', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid');

-- Add subscription fields to profiles table
ALTER TABLE profiles
ADD COLUMN subscription_plan subscription_plan NOT NULL DEFAULT 'free',
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN stripe_customer_id TEXT, -- Stripe Customer ID for subscriptions (different from Connect)
ADD COLUMN subscription_status subscription_status,
ADD COLUMN subscription_current_period_end TIMESTAMPTZ,
ADD COLUMN subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

-- Add indexes for faster lookups
CREATE INDEX idx_profiles_subscription_plan ON profiles(subscription_plan);
CREATE INDEX idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN profiles.subscription_plan IS 'Current subscription plan: free or pro';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe Subscription ID for SaaS billing';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe Customer ID for SaaS subscriptions (separate from Connect)';
COMMENT ON COLUMN profiles.subscription_status IS 'Current subscription status from Stripe';
COMMENT ON COLUMN profiles.subscription_current_period_end IS 'When the current subscription period ends';
COMMENT ON COLUMN profiles.subscription_cancel_at_period_end IS 'Whether subscription will cancel at period end';

