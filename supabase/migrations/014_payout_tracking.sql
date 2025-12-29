-- Migration: Add payout tracking table
-- This allows tracking of cash outs and calculating available funds correctly

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  method TEXT NOT NULL CHECK (method IN ('instant', 'bank')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method_id TEXT, -- Stripe payment method ID for instant payouts
  bank_account_id TEXT, -- Stripe bank account ID for bank transfers
  stripe_payout_id TEXT, -- Stripe payout ID if applicable
  fee_cents INTEGER DEFAULT 0, -- Fee charged for instant payout
  net_amount_cents INTEGER NOT NULL, -- Amount after fees
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payouts_guide_id ON payouts(guide_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);

-- Add updated_at trigger for payouts
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on payouts
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payouts
-- Guides can view their own payouts
CREATE POLICY "Guides can view own payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (auth.uid() = guide_id);

-- Only service role can insert/update payouts (via API)
CREATE POLICY "Service role can manage payouts"
  ON payouts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to get total cashed out amount for a guide
CREATE OR REPLACE FUNCTION get_total_cashed_out(guide_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_cents INTEGER;
BEGIN
  SELECT COALESCE(SUM(net_amount_cents), 0) INTO total_cents
  FROM payouts
  WHERE guide_id = guide_id_param
    AND status IN ('completed', 'processing');
  
  RETURN total_cents;
END;
$$;

GRANT EXECUTE ON FUNCTION get_total_cashed_out(UUID) TO authenticated, anon;

-- Function to get pending payout amount for a guide
CREATE OR REPLACE FUNCTION get_pending_payout_amount(guide_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_cents INTEGER;
BEGIN
  SELECT COALESCE(SUM(net_amount_cents), 0) INTO total_cents
  FROM payouts
  WHERE guide_id = guide_id_param
    AND status IN ('pending', 'processing');
  
  RETURN total_cents;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_payout_amount(UUID) TO authenticated, anon;

COMMENT ON TABLE payouts IS 'Tracks cash out/payout transactions for guides';
COMMENT ON COLUMN payouts.method IS 'Payout method: instant (card) or bank (transfer)';
COMMENT ON COLUMN payouts.status IS 'Payout status: pending, processing, completed, or failed';
COMMENT ON COLUMN payouts.net_amount_cents IS 'Amount after fees are deducted';

