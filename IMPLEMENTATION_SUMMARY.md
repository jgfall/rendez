# MVP Implementation Summary

## ✅ Completed Tasks

### 0. Repo Safety
- ✅ Created branch `mvp-no-stripe-connect`
- ✅ Tagged current state as `pre-lemon-v1`
- ✅ Created `ENV_VARS_SNAPSHOT.md` with all Stripe environment variables

### 1. Stripe Removal
- ✅ Deleted all Stripe API routes (`/api/stripe/*`)
- ✅ Removed `stripe` package from `package.json`
- ✅ Removed Stripe references from UI components
- ✅ Updated success page (removed Stripe verification)
- ✅ Kept Stripe columns in database (not writing to them, for backward compatibility)

### 2. Manual Confirmation Flow
- ✅ Created `/api/proposals/[proposalId]/confirm` endpoint for manual confirmation
- ✅ Added `ConfirmActions` component for guides to manually confirm bookings
- ✅ Updated proposal detail page with manual confirmation controls
- ✅ Updated public proposal page to show "Request to Book" or "Pay Deposit" (external link)
- ✅ Updated `ProposalRenderer` component to support new flow
- ✅ Created `/api/proposals/[slug]/request-booking` endpoint

### 3. Lemon Squeezy Integration
- ✅ Created `/api/billing/checkout` endpoint for Lemon Squeezy checkout
- ✅ Created `/api/billing/webhook` endpoint for Lemon Squeezy webhooks
- ✅ Created migration `023_lemon_squeezy_fields.sql` to add `ls_customer_id` and `ls_subscription_id`
- ✅ Updated subscription page to use Lemon Squeezy
- ✅ Updated upgrade modal to use Lemon Squeezy checkout
- ✅ Updated database types to include Lemon Squeezy fields

### 4. Email System (Resend)
- ✅ Installed `resend` package
- ✅ Created `/lib/email.ts` with email utility functions
- ✅ Created email templates for:
  - Booking request notifications (to guide)
  - Proposal link emails (to client)
  - Confirmation emails (to client)
- ✅ Created `/api/email/send` generic email endpoint
- ✅ Integrated emails into booking request and confirmation flows

### 5. Payment Links
- ✅ Created migration `022_payment_link_url.sql` to add `payment_link_url` to profiles
- ✅ Added payment link URL field to profile page
- ✅ Updated public proposal page to use guide's payment link
- ✅ Payment link opens in new tab when client clicks "Pay Deposit"

## 📋 Required Environment Variables

### Lemon Squeezy
```bash
LEMON_SQUEEZY_STORE_SLUG=your-store-slug
LEMON_SQUEEZY_VARIANT_ID_MONTHLY=variant-id-for-monthly
LEMON_SQUEEZY_VARIANT_ID_YEARLY=variant-id-for-yearly
LEMON_SQUEEZY_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_LEMON_SQUEEZY_STORE_SLUG=your-store-slug
```

### Resend (Email)
```bash
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Existing (Still Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key (optional)
```

## 🗄️ Database Migrations to Run

1. **022_payment_link_url.sql** - Adds `payment_link_url` to profiles
2. **023_lemon_squeezy_fields.sql** - Adds `ls_customer_id` and `ls_subscription_id` to profiles

Run these in your Supabase SQL Editor.

## 🚀 Next Steps

### 1. Set Up Lemon Squeezy
1. Create a Lemon Squeezy account
2. Create a store
3. Create a product "Rendez — Monthly" ($29/month)
4. Create a product "Rendez — Yearly" ($274/year)
5. Get the variant IDs from each product
6. Set up webhook endpoint pointing to: `https://your-domain.com/api/billing/webhook`
7. Subscribe to events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_payment_success`
8. Copy webhook secret
9. Add environment variables

### 2. Set Up Resend
1. Create a Resend account
2. Verify your domain (or use Resend's default domain for testing)
3. Get API key
4. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to environment variables

### 3. Test the Flow
1. Test manual confirmation flow
2. Test booking request → email notification
3. Test confirmation → email to client
4. Test Lemon Squeezy checkout flow
5. Test webhook handling

## 📝 Notes

- Stripe columns are kept in the database for backward compatibility but are no longer used
- The app now uses manual confirmation instead of automatic payment processing
- Guides set their own payment links (Stripe Payment Links, PayPal.me, etc.)
- Lemon Squeezy handles SaaS subscriptions for guides
- Resend handles all transactional emails

## 🔄 Migration Path

If you need to roll back:
```bash
git checkout pre-lemon-v1
```

To continue from this point:
```bash
git checkout mvp-no-stripe-connect
```

