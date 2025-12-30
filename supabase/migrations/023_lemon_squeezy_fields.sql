-- Migration: Add Lemon Squeezy fields to profiles table
-- Replaces Stripe subscription fields with Lemon Squeezy

-- Add Lemon Squeezy fields
ALTER TABLE profiles
ADD COLUMN ls_customer_id TEXT,
ADD COLUMN ls_subscription_id TEXT;

-- Add indexes
CREATE INDEX idx_profiles_ls_customer_id ON profiles(ls_customer_id) WHERE ls_customer_id IS NOT NULL;
CREATE INDEX idx_profiles_ls_subscription_id ON profiles(ls_subscription_id) WHERE ls_subscription_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN profiles.ls_customer_id IS 'Lemon Squeezy Customer ID';
COMMENT ON COLUMN profiles.ls_subscription_id IS 'Lemon Squeezy Subscription ID';

-- Note: We keep stripe_subscription_id and stripe_customer_id columns for backward compatibility
-- but they will no longer be used for new subscriptions

