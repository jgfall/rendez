# Stripe Connect Deployment Guide

This guide walks you through deploying Stripe Connect to start onboarding guides.

## Prerequisites

- ✅ Stripe account (with API keys)
- ✅ Supabase project set up
- ✅ Production deployment (Vercel, etc.)
- ✅ Production domain configured

## Step 1: Run Database Migration

1. Open your **Supabase Dashboard** → **SQL Editor**
2. Copy the contents of `supabase/migrations/016_stripe_connect.sql`
3. Paste and run the migration

This adds the following fields to `profiles`:
- `stripe_account_id`
- `stripe_details_submitted`
- `stripe_charges_enabled`
- `stripe_payouts_enabled`
- `stripe_onboarding_completed_at`

**Verify:** Check that the migration ran successfully (no errors).

## Step 2: Configure Stripe Connect

### 2.1 Enable Stripe Connect in Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Settings** → **Connect** → **Settings**
3. Enable **Express accounts** (if not already enabled)
4. Configure your platform settings:
   - **Platform name**: Rendez (or your app name)
   - **Support email**: Your support email
   - **Support phone**: (Optional)

### 2.2 Set Up Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to:
   ```
   https://your-production-domain.com/api/stripe/webhook
   ```
4. Select events to listen to:
   - ✅ `checkout.session.completed` (already configured)
   - ✅ `account.updated` (NEW - for Connect account status)
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

## Step 3: Configure Environment Variables

Add these to your production environment (Vercel, etc.):

### Required Variables

```bash
# Existing Stripe variables (should already be set)
STRIPE_SECRET_KEY=sk_live_...          # Your live Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook secret from Step 2.2
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Your live publishable key

# Make sure this is set to your production URL
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### Optional: Platform Fees

If you want to collect platform fees from each transaction:

```bash
# Option 1: Percentage fee (e.g., 2.9%)
STRIPE_PLATFORM_FEE_PERCENT=2.9

# Option 2: Fixed fee in cents (e.g., $0.30 = 30 cents)
STRIPE_PLATFORM_FEE_FIXED_CENTS=30
```

**Note:** You can use either percentage OR fixed fee, not both. If both are set, percentage takes precedence.

## Step 4: Deploy Code

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Add Stripe Connect integration"
   git push
   ```

2. Deploy to your hosting platform (Vercel, etc.)
3. Verify deployment succeeded

## Step 5: Test the Flow

### 5.1 Test Guide Onboarding

1. **As a guide**, log into your app
2. Go to **Profile** → **Payments** section
3. Click **"Connect Stripe"**
4. Complete Stripe's onboarding flow:
   - Business details
   - Bank account information
   - Identity verification (if required)
5. After completion, you should be redirected back to your app
6. Verify the Payments section shows **"Payments Enabled"** ✅

### 5.2 Test Payment Flow

1. **As a guide**, create a new proposal with a deposit amount
2. **As a guest**, open the proposal link
3. Click **"Reserve with deposit"**
4. Complete test payment (use Stripe test card: `4242 4242 4242 4242`)
5. Verify:
   - ✅ Payment succeeds
   - ✅ Proposal unlocks (reveal blocks show)
   - ✅ Funds appear in guide's Stripe account (Stripe Dashboard → Connect → Accounts)

### 5.3 Verify Webhook Events

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check **Events** tab
4. You should see:
   - `account.updated` events when guides complete onboarding
   - `checkout.session.completed` events when payments succeed

## Step 6: Monitor & Troubleshoot

### Common Issues

**Issue: "Guide has not enabled payments" error**
- **Cause:** Guide hasn't completed Stripe onboarding
- **Fix:** Guide needs to complete onboarding in Profile → Payments

**Issue: Webhook not receiving events**
- **Cause:** Webhook URL incorrect or not accessible
- **Fix:** 
  - Verify webhook URL is correct
  - Check that your production domain is accessible
  - Verify webhook secret matches

**Issue: Funds not appearing in guide's account**
- **Cause:** Connect not properly configured
- **Fix:**
  - Check guide's Stripe account status in Stripe Dashboard
  - Verify `stripe_charges_enabled` is `true` in database
  - Check Stripe Dashboard → Connect → Accounts for the account

### Monitoring

1. **Stripe Dashboard** → **Connect** → **Accounts**
   - View all connected accounts
   - Check account status
   - Monitor payouts

2. **Stripe Dashboard** → **Developers** → **Webhooks**
   - Monitor webhook delivery
   - Check for failed events
   - View event logs

3. **Supabase Dashboard** → **Table Editor** → **profiles**
   - Check `stripe_account_id` is populated
   - Verify `stripe_charges_enabled` = `true` for active guides

## Step 7: Onboard Your First Guides

Once everything is tested:

1. Share your app with guides
2. Guides go to **Profile** → **Payments** → **Connect Stripe**
3. They complete Stripe's Express onboarding (takes ~5-10 minutes)
4. Once enabled, they can start accepting deposits!

## Additional Notes

### Test Mode vs Production

- **Test Mode:** Uses Stripe test keys, no real money
- **Production:** Uses live keys, real money transfers

Make sure you're using the correct keys for your environment!

### Express Dashboard Access

Guides can access their Stripe Express dashboard via:
- **Profile** → **Payments** → **Manage in Stripe** button
- Or directly at: `https://connect.stripe.com/express/...`

### Refunds

Refunds can be initiated:
- By guides from their Stripe Express dashboard
- Or programmatically via Stripe API (future enhancement)

### Support

If guides have issues:
1. Check their Stripe account status in Stripe Dashboard
2. Verify webhook events are being received
3. Check database for `stripe_charges_enabled` status

---

**You're all set!** 🎉 Guides can now connect their Stripe accounts and start accepting deposits directly.

