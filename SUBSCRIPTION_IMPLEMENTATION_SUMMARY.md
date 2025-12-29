# Subscription System Implementation Summary

## ✅ Completed

### 1. Database Schema
- **Migration:** `020_subscriptions.sql`
- **Fields Added:**
  - `subscription_plan` (enum: 'free' | 'pro') - defaults to 'free'
  - `stripe_subscription_id` - Stripe Subscription ID
  - `stripe_customer_id` - Stripe Customer ID for SaaS subscriptions (separate from Connect)
  - `subscription_status` - Current subscription status
  - `subscription_current_period_end` - When current period ends
  - `subscription_cancel_at_period_end` - Whether subscription will cancel

### 2. TypeScript Types
- Updated `src/types/database.ts` with subscription fields
- Added `SubscriptionPlan` and `SubscriptionStatus` types

### 3. Subscription Utilities
- **File:** `src/lib/subscriptions.ts`
- **Functions:**
  - `getPlanLimits()` - Returns limits for each plan
  - `isSubscriptionActive()` - Checks if subscription is active
  - `canCreateTourTemplate()` - Checks if user can create more templates
  - `hasFeatureAccess()` - Checks feature access
  - `getPlatformFeePercent()` - Returns platform fee percentage

**Plan Limits:**
- **Free:** 1 tour template, 3% platform fee, no white label, no custom branding
- **Pro:** Unlimited templates, 0% platform fee, white label, custom branding

### 4. Subscription Checkout API
- **File:** `src/app/api/stripe/create-subscription/route.ts`
- Creates Stripe checkout session for subscriptions
- Handles monthly ($29) and yearly ($274) plans
- Creates Stripe customer if needed
- **Required Env Vars:**
  - `STRIPE_PRICE_ID_MONTHLY` - Get from Stripe Dashboard
  - `STRIPE_PRICE_ID_YEARLY` - Get from Stripe Dashboard

### 5. Customer Portal API
- **File:** `src/app/api/stripe/create-portal-session/route.ts`
- Creates Stripe customer portal session for subscription management
- Allows users to update payment method, cancel subscription, etc.

### 6. Webhook Handlers
- **Updated:** `src/app/api/stripe/webhook/route.ts`
- **Events Handled:**
  - `checkout.session.completed` (subscription mode) - Activates subscription
  - `customer.subscription.created` - Updates subscription status
  - `customer.subscription.updated` - Updates subscription status
  - `customer.subscription.deleted` - Downgrades to free plan

### 7. Free Plan Limits Enforcement
- **Tour Creation:** `src/components/tours/tour-editor.tsx`
  - Checks `canCreateTourTemplate()` before allowing creation
  - Shows upgrade modal if limit reached
- **Tours Page:** `src/app/app/tours/page.tsx`
  - Shows upgrade prompt if user is at limit
  - Disables "New Tour Template" button if at limit

### 8. Upgrade Prompts
- **Upgrade Modal Component:** `src/components/subscriptions/upgrade-modal.tsx`
  - Reusable modal for upgrade prompts
  - Shows plan features and pricing
  - Handles subscription checkout
- **Onboarding:** `src/app/(auth)/onboarding/page.tsx`
  - Pricing step allows plan selection
  - Pro plan redirects to subscription checkout
  - Free plan continues with onboarding
- **Tour Creation:** Shows upgrade modal when limit reached
- **Tours Page:** Shows upgrade banner when at limit

### 9. Subscription Management Page
- **File:** `src/app/app/settings/subscription/page.tsx`
- Shows current plan and status
- Displays next billing date
- "Upgrade to Pro" button (if free)
- "Manage Subscription" button (if pro) - opens Stripe customer portal
- Shows plan features comparison

### 10. Platform Fee Logic
- **Updated:** `src/app/api/stripe/create-checkout-session/route.ts`
  - Free plans: 3% platform fee
  - Pro plans: 0% platform fee
- **Updated:** `src/app/api/proposals/actions/complete/route.ts`
  - Applies same fee logic to remainder payments

## 🔧 Next Steps (Required)

### 1. Get Stripe Price IDs
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Products**
2. Find product `prod_ThAimwPWn8a5ux`
3. Get Price IDs for:
   - Monthly: $29/month
   - Yearly: $274/year
4. Add to environment variables:
   ```bash
   STRIPE_PRICE_ID_MONTHLY=price_xxxxx
   STRIPE_PRICE_ID_YEARLY=price_xxxxx
   ```

### 2. Run Database Migration
Run `supabase/migrations/020_subscriptions.sql` in Supabase SQL Editor

### 3. Update Stripe Webhook
Add these events to your Stripe webhook endpoint:
- `checkout.session.completed` (already added, but verify it handles subscription mode)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 4. Test the Flow
1. **Test Free Plan:**
   - Create account → should default to free
   - Try to create 2nd tour template → should show upgrade prompt
   - Check platform fee is applied (3%)

2. **Test Pro Plan:**
   - Upgrade to Pro via checkout
   - Verify subscription status in database
   - Create multiple tour templates → should work
   - Check platform fee is 0%

3. **Test Subscription Management:**
   - View subscription page
   - Cancel subscription → should downgrade to free
   - Verify limits are enforced after downgrade

## 📋 Files Created/Modified

### New Files
- `supabase/migrations/020_subscriptions.sql`
- `src/lib/subscriptions.ts`
- `src/app/api/stripe/create-subscription/route.ts`
- `src/app/api/stripe/create-portal-session/route.ts`
- `src/components/subscriptions/upgrade-modal.tsx`
- `src/app/app/settings/subscription/page.tsx`

### Modified Files
- `src/types/database.ts` - Added subscription types
- `src/app/api/stripe/webhook/route.ts` - Added subscription webhook handlers
- `src/app/api/stripe/create-checkout-session/route.ts` - Added subscription-based platform fees
- `src/app/api/proposals/actions/complete/route.ts` - Added subscription-based platform fees
- `src/components/tours/tour-editor.tsx` - Added limit enforcement and upgrade modal
- `src/app/app/tours/page.tsx` - Added upgrade prompts
- `src/app/(auth)/onboarding/page.tsx` - Added plan selection and upgrade flow
- `src/components/ui/modern-pricing-table.tsx` - Added `onSelectPlan` callback

## 🎯 Key Features

1. **Free Plan Limits:**
   - 1 tour template max
   - 3% platform fee on all transactions
   - No white label or custom branding

2. **Pro Plan Benefits:**
   - Unlimited tour templates
   - 0% platform fee (only Stripe fees)
   - White label and custom branding
   - Priority support

3. **Upgrade Flow:**
   - Onboarding: Select plan → Pro redirects to checkout
   - Tour creation: Upgrade modal when limit reached
   - Tours page: Upgrade banner when at limit
   - Settings: Subscription management page

4. **Platform Fees:**
   - Automatically applied based on subscription plan
   - Free: 3% on all transactions
   - Pro: 0% (only Stripe's standard fees)

## 📝 Notes

- Subscription system is separate from Stripe Connect
- Users can have both a subscription (SaaS) and a Connect account (payments)
- Platform fees are automatically calculated based on subscription plan
- Webhooks handle subscription lifecycle automatically
- Free plan defaults for all new users

---

**Ready to test!** Just add the Stripe Price IDs and run the migration.

