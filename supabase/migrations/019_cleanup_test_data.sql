-- Cleanup script for test data before going to production
-- Run this in Supabase SQL Editor to clean up test payments

-- Option 1: Delete proposals with test payment IDs (recommended if you want a clean slate)
-- Uncomment the following if you want to delete test proposals entirely:

-- DELETE FROM proposals
-- WHERE 
--   stripe_checkout_session_id LIKE 'test_%' 
--   OR stripe_payment_intent_id LIKE 'test_%'
--   OR stripe_remainder_payment_intent_id LIKE 'test_%'
--   OR stripe_checkout_session_id LIKE 'test_session_%'
--   OR stripe_remainder_session_id LIKE 'test_%';

-- Option 2: Keep proposals but clear test payment data (recommended if you want to keep proposal structure)
-- This allows you to keep the proposals but remove test payment information
-- Uncomment the following to clear test payment data:

UPDATE proposals
SET 
  stripe_checkout_session_id = NULL,
  stripe_payment_intent_id = NULL,
  stripe_remainder_payment_intent_id = NULL,
  stripe_remainder_session_id = NULL,
  deposit_paid_at = NULL,
  remainder_paid_at = NULL,
  stripe_customer_id = NULL,
  status = CASE 
    WHEN status = 'deposit_paid' THEN 'sent'
    WHEN status = 'confirmed' THEN 'sent'
    ELSE status
  END
WHERE 
  stripe_checkout_session_id LIKE 'test_%' 
  OR stripe_payment_intent_id LIKE 'test_%'
  OR stripe_remainder_payment_intent_id LIKE 'test_%'
  OR stripe_checkout_session_id LIKE 'test_session_%'
  OR stripe_remainder_session_id LIKE 'test_%';

-- Verify cleanup (check how many rows were affected)
-- SELECT COUNT(*) as test_proposals_cleaned
-- FROM proposals
-- WHERE 
--   stripe_checkout_session_id LIKE 'test_%' 
--   OR stripe_payment_intent_id LIKE 'test_%'
--   OR stripe_remainder_payment_intent_id LIKE 'test_%';

-- Note: This does NOT delete Stripe Connect accounts
-- Test Stripe Connect accounts are in Stripe's test mode and won't affect production
-- You can manage them in Stripe Dashboard → Connect → Accounts (test mode)

