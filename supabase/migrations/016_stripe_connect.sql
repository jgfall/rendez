-- Migration: Add Stripe Connect fields to profiles table
-- Enables guides to connect their Stripe accounts for direct payment processing

-- Add Stripe Connect fields to profiles table
ALTER TABLE profiles
ADD COLUMN stripe_account_id TEXT,
ADD COLUMN stripe_details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN stripe_onboarding_completed_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX idx_profiles_stripe_account_id ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connect Express account ID';
COMMENT ON COLUMN profiles.stripe_details_submitted IS 'Whether the guide has submitted required details to Stripe';
COMMENT ON COLUMN profiles.stripe_charges_enabled IS 'Whether the guide can accept charges (from Stripe account.charges_enabled)';
COMMENT ON COLUMN profiles.stripe_payouts_enabled IS 'Whether the guide can receive payouts (from Stripe account.payouts_enabled)';
COMMENT ON COLUMN profiles.stripe_onboarding_completed_at IS 'Timestamp when Stripe onboarding was completed';

