-- Migration: Fix payout calculation to include pending payouts
-- This ensures that once a payout is initiated, the funds are immediately deducted from available balance

-- Update function to include pending payouts in the cashed out total
-- Once a payout is initiated, those funds should no longer be available for cash out
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
    AND status IN ('pending', 'processing', 'completed');
  
  RETURN total_cents;
END;
$$;

COMMENT ON FUNCTION get_total_cashed_out(UUID) IS 'Returns total amount cashed out including pending, processing, and completed payouts (excludes failed payouts)';

