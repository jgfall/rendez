-- Add deposit_percentage to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deposit_percentage INTEGER NOT NULL DEFAULT 50;

COMMENT ON COLUMN profiles.deposit_percentage IS 'Default deposit percentage for proposals (0-100)';

