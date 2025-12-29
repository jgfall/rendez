# Cleanup Guide: Preparing for Production

This guide helps you clean up all test data before going live with Stripe Connect.

## Step 1: Clean Up Test Data in Database

### Option A: SQL Script (Recommended)

Run this in your Supabase SQL Editor to clean up test proposals and payments:

```sql
-- Delete test proposals (those with test payment IDs)
DELETE FROM proposals
WHERE 
  stripe_checkout_session_id LIKE 'test_%' 
  OR stripe_payment_intent_id LIKE 'test_%'
  OR stripe_remainder_payment_intent_id LIKE 'test_%'
  OR stripe_checkout_session_id LIKE 'test_session_%'
  OR stripe_remainder_session_id LIKE 'test_%';

-- Optional: If you want to keep proposals but just clear test payment data
-- UPDATE proposals
-- SET 
--   stripe_checkout_session_id = NULL,
--   stripe_payment_intent_id = NULL,
--   stripe_remainder_payment_intent_id = NULL,
--   stripe_remainder_session_id = NULL,
--   deposit_paid_at = NULL,
--   remainder_paid_at = NULL,
--   stripe_customer_id = NULL,
--   status = 'sent'
-- WHERE 
--   stripe_checkout_session_id LIKE 'test_%' 
--   OR stripe_payment_intent_id LIKE 'test_%'
--   OR stripe_remainder_payment_intent_id LIKE 'test_%';

-- Reset Stripe Connect status for test guides (if you want to re-onboard)
-- UPDATE profiles
-- SET 
--   stripe_account_id = NULL,
--   stripe_details_submitted = FALSE,
--   stripe_charges_enabled = FALSE,
--   stripe_payouts_enabled = FALSE,
--   stripe_onboarding_completed_at = NULL
-- WHERE stripe_account_id LIKE 'acct_%';  -- Only if you want to clear all Connect accounts
```

### Option B: Manual Cleanup via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Table Editor** → `proposals`
2. Filter for rows with:
   - `stripe_checkout_session_id` starting with `test_`
   - `stripe_payment_intent_id` starting with `test_`
3. Delete or update these rows

## Step 2: Clean Up Test Stripe Connect Accounts

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Connect** → **Accounts**
2. Switch to **Test mode** (toggle in top right)
3. Review all test accounts
4. For each test account:
   - Click on the account
   - Go to **Settings** → **Account details**
   - Click **Delete account** (if you want to remove it)
   - Or just leave them (they won't affect production)

**Note:** Test accounts are separate from production accounts, so they won't interfere. You can leave them if you want to keep test data for future testing.

## Step 3: Clean Up Test Payments in Stripe

1. In Stripe Dashboard, make sure you're in **Test mode**
2. Go to **Payments** → Review test payments
3. These are in test mode, so they don't affect production
4. You can leave them or delete them (optional)

## Step 4: Verify Production Environment Variables

Make sure your production environment has **LIVE** Stripe keys (not test keys):

```bash
# Production (LIVE keys - starts with sk_live_ and pk_live_)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From production webhook endpoint
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# Make sure NODE_ENV is set to 'production' (or not set to 'development')
# This ensures test mode bypass logic doesn't activate
```

## Step 5: Verify Test Mode Logic Won't Activate

The code automatically disables test mode bypass when:
- `NODE_ENV !== 'development'` OR
- Guide has Stripe Connect enabled

In production, `NODE_ENV` should be `production`, so test mode won't activate.

## Step 6: Final Checklist

Before going live, verify:

- [ ] Database cleaned of test proposals/payments (or test IDs cleared)
- [ ] Production environment variables use **LIVE** Stripe keys (`sk_live_`, `pk_live_`)
- [ ] `NEXT_PUBLIC_APP_URL` points to production domain
- [ ] Webhook endpoint configured in Stripe Dashboard (production mode)
- [ ] Webhook secret matches production environment variable
- [ ] Database migration `016_stripe_connect.sql` has been run
- [ ] Database migration `018_store_stripe_customer.sql` has been run
- [ ] Test mode is disabled (code will use real Stripe in production)

## Step 7: Test in Production (Staging First Recommended)

Before going fully live:

1. **Create a staging environment** with production Stripe keys
2. **Test with a real guide account:**
   - Connect Stripe (real onboarding)
   - Create a proposal
   - Make a small test payment (e.g., $1)
   - Verify funds appear in guide's Stripe account
3. **Verify webhooks are working** in Stripe Dashboard
4. **Check database** to ensure payment data is stored correctly

## Important Notes

### Test Mode vs Production Mode

- **Test Mode:** Uses `sk_test_` and `pk_test_` keys, test Stripe accounts
- **Production Mode:** Uses `sk_live_` and `pk_live_` keys, real Stripe accounts

The code automatically detects which mode based on your API keys. Test mode bypass logic only activates if:
- `NODE_ENV === 'development'` AND
- Guide doesn't have Stripe Connect enabled

In production, this won't be an issue.

### Stripe Connect Accounts

- Test accounts and production accounts are **completely separate**
- Test accounts won't appear in production mode
- You can keep test accounts for future testing

### Database Cleanup

- Test payment IDs (starting with `test_`) won't work with real Stripe
- It's safe to delete proposals with test payment IDs
- Or just clear the payment-related fields if you want to keep the proposals

---

**Ready to go live?** Follow the deployment guide in `DEPLOYMENT_STRIPE_CONNECT.md` for the full production setup.

