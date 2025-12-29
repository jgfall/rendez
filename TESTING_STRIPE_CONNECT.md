# Testing Stripe Connect - Step by Step

This guide walks you through testing Stripe Connect end-to-end before going live.

## Phase 1: Local Testing (Recommended First)

### Step 1: Run Database Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire contents of `supabase/migrations/016_stripe_connect.sql`
3. Paste and click **Run**
4. Verify: Check the `profiles` table - you should see the new Stripe columns

### Step 2: Set Up Local Environment Variables

1. Create/update `.env.local` in your project root:

```bash
# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe TEST keys (use test mode for local testing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # We'll get this in Step 3
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App URL (localhost for testing)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Platform fees (skip for testing)
# STRIPE_PLATFORM_FEE_PERCENT=2.9
```

2. Get your Stripe test keys:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
   - Copy **Secret key** (starts with `sk_test_`)
   - Copy **Publishable key** (starts with `pk_test_`)

### Step 3: Set Up Stripe Webhook for Local Testing

We'll use Stripe CLI to forward webhooks to localhost:

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe CLI:**
   ```bash
   stripe login
   ```
   (This opens a browser to authenticate)

3. **Start webhook forwarding** (in a separate terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   
   This will output a webhook signing secret like:
   ```
   > Ready! Your webhook signing secret is whsec_... (^C to quit)
   ```

4. **Copy the webhook secret** and add it to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. **Keep this terminal running** - it forwards webhooks to your local server

### Step 4: Start Your Local Server

1. In your main terminal:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

### Step 5: Test Guide Onboarding Flow

1. **Create a test guide account:**
   - Sign up or log in as a guide
   - Go to **Profile** page

2. **Connect Stripe:**
   - Scroll to **Payments** section
   - Click **"Connect Stripe"** button
   - You'll be redirected to Stripe's test onboarding

3. **Complete Stripe Test Onboarding:**
   - Use Stripe's test data:
     - Business type: Individual
     - Fill in any test data
     - Stripe accepts anything in test mode
   - Complete all steps (business info, bank details, etc.)
   - Click **"Submit"**

4. **Verify Return:**
   - You should be redirected back to your app
   - Payments section should show **"Payments Enabled"** ✅

5. **Check Database:**
   - In Supabase Dashboard → Table Editor → `profiles`
   - Find your test guide's row
   - Verify:
     - `stripe_account_id` is populated
     - `stripe_charges_enabled` = `true`
     - `stripe_payouts_enabled` = `true`

### Step 6: Test Payment Flow

1. **As the guide:**
   - Create a new proposal with a deposit (e.g., $50)
   - Copy the proposal link

2. **As a guest (open in incognito/private window):**
   - Open the proposal link
   - Click **"Reserve with deposit"**
   - Use Stripe test card:
     - Card: `4242 4242 4242 4242`
     - Expiry: Any future date (e.g., `12/34`)
     - CVC: Any 3 digits (e.g., `123`)
     - ZIP: Any 5 digits (e.g., `12345`)
   - Complete payment

3. **Verify Payment:**
   - ✅ Payment succeeds
   - ✅ Redirected to success page
   - ✅ Proposal unlocks (reveal blocks show)
   - ✅ In Stripe Dashboard → **Connect** → **Accounts**, you should see the payment

4. **Check Webhook Events:**
   - In the terminal running `stripe listen`, you should see:
     ```
     checkout.session.completed [200]
     ```
   - In Stripe Dashboard → **Developers** → **Events**, verify the event was received

### Step 7: Verify Funds Routing

1. **Check Stripe Dashboard:**
   - Go to **Connect** → **Accounts**
   - Click on your test guide's account
   - Go to **Balance** tab
   - You should see the test payment amount

2. **Verify No Funds in Platform Account:**
   - Go to **Payments** in Stripe Dashboard
   - The payment should NOT appear in your platform account
   - It should only appear in the connected account

---

## Phase 2: Staging on Vercel (Before Production)

Once local testing works, deploy to staging:

### Step 1: Create Staging Project in Vercel

1. Push your code to GitHub (if not already)
2. Go to [Vercel Dashboard](https://vercel.com)
3. Click **Add New Project**
4. Import your GitHub repository
5. Configure:
   - **Project Name**: `rendez-staging` (or similar)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)

### Step 2: Set Up Staging Domain

1. In Vercel project settings → **Domains**
2. Add a domain:
   - Option A: Use Vercel's free domain: `your-project.vercel.app`
   - Option B: Add a subdomain: `staging.yourdomain.com`
     - Add DNS record: `CNAME staging -> cname.vercel-dns.com`

### Step 3: Configure Environment Variables in Vercel

1. In Vercel project → **Settings** → **Environment Variables**
2. Add all variables (use TEST keys for staging):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe TEST keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App URL (your staging domain)
NEXT_PUBLIC_APP_URL=https://your-staging-domain.com

# Webhook secret (we'll get this in next step)
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Make sure to select **Production, Preview, and Development** for all variables
4. Click **Save**

### Step 4: Deploy to Staging

1. Vercel will auto-deploy when you push to your main branch
2. Or manually trigger: **Deployments** → **Redeploy**
3. Wait for deployment to complete
4. Visit your staging URL

### Step 5: Set Up Stripe Webhook for Staging

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. Set endpoint URL:
   ```
   https://your-staging-domain.com/api/stripe/webhook
   ```
4. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `account.updated`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to Vercel environment variables:
   - Go to Vercel → Settings → Environment Variables
   - Update `STRIPE_WEBHOOK_SECRET` with the new value
   - **Redeploy** the project

### Step 6: Test on Staging

Repeat the same tests as Phase 1, but on your staging URL:
- Guide onboarding
- Payment flow
- Webhook events
- Funds routing

---

## Phase 3: Production Setup

Once staging works perfectly:

### Step 1: Get Stripe Live Keys

1. In Stripe Dashboard, switch to **Live mode** (toggle in top right)
2. Go to **Developers** → **API keys**
3. Copy:
   - **Secret key** (starts with `sk_live_`)
   - **Publishable key** (starts with `pk_live_`)

### Step 2: Create Production Vercel Project

1. Create a new Vercel project (or use same project with production domain)
2. Add your production domain:
   - In Vercel → **Settings** → **Domains**
   - Add: `yourdomain.com` and `www.yourdomain.com`
   - Follow DNS instructions (add A/CNAME records)

### Step 3: Configure Production Environment Variables

1. In Vercel → **Settings** → **Environment Variables**
2. Add/update with **LIVE** Stripe keys:

```bash
# Use LIVE Stripe keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Production URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Production webhook secret (get in next step)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 4: Set Up Production Webhook

1. In Stripe Dashboard (Live mode) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set URL:
   ```
   https://yourdomain.com/api/stripe/webhook
   ```
4. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `account.updated`
5. Copy the **Signing secret**
6. Update in Vercel environment variables
7. **Redeploy**

### Step 5: Enable Stripe Connect

1. In Stripe Dashboard (Live mode) → **Settings** → **Connect**
2. Enable **Express accounts**
3. Configure platform settings:
   - Platform name: Your app name
   - Support email: Your email

### Step 6: Final Production Test

1. Test with a real guide account (or your own)
2. Complete onboarding with real information
3. Test a small real payment ($1-5)
4. Verify funds appear in guide's Stripe account

---

## Troubleshooting

### Webhook Not Receiving Events

**Local:**
- Make sure `stripe listen` is running
- Check the webhook secret matches in `.env.local`
- Verify the endpoint URL in Stripe Dashboard

**Staging/Production:**
- Verify webhook URL is accessible (try visiting it - should return error, but confirms it's reachable)
- Check Vercel deployment logs
- Verify webhook secret in environment variables

### "Guide has not enabled payments" Error

- Guide needs to complete Stripe onboarding
- Check `stripe_charges_enabled` in database
- Verify `account.updated` webhook is configured

### Payments Not Routing to Guide

- Verify `stripe_account_id` is set in database
- Check Stripe Dashboard → Connect → Accounts
- Verify `payment_intent_data.transfer_data.destination` is set in checkout session

### Test Cards for Stripe

Use these in test mode:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

---

## Next Steps After Testing

1. ✅ All tests pass locally
2. ✅ All tests pass on staging
3. ✅ Production deployed and tested
4. 🎉 Start onboarding real guides!

