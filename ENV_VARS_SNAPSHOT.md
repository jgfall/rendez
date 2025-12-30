# Environment Variables Snapshot (pre-lemon-v1)

This document captures all Stripe-related environment variables used before removal.

## Stripe Environment Variables Used

### Required Stripe Variables
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_live_... or sk_test_...)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (whsec_...)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (pk_live_... or pk_test_...)

### Subscription Variables
- `STRIPE_PRICE_ID_MONTHLY` - Monthly subscription price ID
- `STRIPE_PRICE_ID_YEARLY` - Yearly subscription price ID

### Optional Stripe Connect Variables
- `STRIPE_PLATFORM_FEE_PERCENT` - Platform fee percentage (e.g., "2.9")
- `STRIPE_PLATFORM_FEE_FIXED_CENTS` - Fixed platform fee in cents (e.g., "30")

## Other Environment Variables (Non-Stripe)

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_APP_URL` - App URL (e.g., http://localhost:3000)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key (optional)

## Notes

- All Stripe variables will be removed in favor of Lemon Squeezy for subscriptions
- Stripe Connect functionality will be removed
- Client payment processing will be handled externally (Stripe Payment Links, PayPal.me, etc.)

