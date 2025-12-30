-- Migration: Add payment_link_url to profiles table
-- Allows guides to set an external payment link (Stripe Payment Link, PayPal.me, etc.)

-- Add payment_link_url field to profiles table
ALTER TABLE profiles
ADD COLUMN payment_link_url TEXT;

-- Add comment
COMMENT ON COLUMN profiles.payment_link_url IS 'External payment link URL (Stripe Payment Link, PayPal.me, Wise, etc.) for client deposits';

