-- Migration: Add remainder payment tracking and completed status

-- Add remainder payment fields to proposals
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS remainder_cents INTEGER,
ADD COLUMN IF NOT EXISTS remainder_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_remainder_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_remainder_payment_intent_id TEXT;

-- Add 'completed' status to proposal_status enum
-- Note: This requires dropping and recreating the enum, which is complex
-- For now, we'll use 'confirmed' for completed tours and track completion separately
-- If needed, we can add a migration later to add 'completed' status

-- Update the proposal payment function to handle remainder payments
CREATE OR REPLACE FUNCTION update_proposal_remainder_payment(
  proposal_id_param UUID,
  checkout_session_id TEXT,
  payment_intent_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE proposals
  SET
    remainder_paid_at = NOW(),
    stripe_remainder_session_id = checkout_session_id,
    stripe_remainder_payment_intent_id = payment_intent_id,
    updated_at = NOW()
  WHERE id = proposal_id_param
    AND remainder_paid_at IS NULL; -- Idempotency check
END;
$$;

