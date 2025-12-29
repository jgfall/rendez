-- Migration: Add Stripe customer ID to proposals for automatic remainder charging
-- This allows charging the customer's card on file when marking tour complete

ALTER TABLE proposals
ADD COLUMN stripe_customer_id TEXT;

CREATE INDEX idx_proposals_stripe_customer_id ON proposals(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN proposals.stripe_customer_id IS 'Stripe customer ID from deposit payment, used to charge remainder automatically';

