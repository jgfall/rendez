# Rendez - Tour Proposals Made Beautiful

A Next.js + Supabase + Stripe MVP for independent tour guides to create stunning tour proposals and collect deposits.

## Features

- 🎨 **Beautiful Proposals** - Create mobile-first tour proposals with customizable itinerary blocks
- 🔒 **Secret Locations** - Keep venue details private until clients pay the deposit
- 💳 **Stripe Integration** - Collect deposits via Stripe Checkout
- 🔐 **Secure by Design** - Server-side enforcement of unlock rules via Supabase RLS + RPC
- 📱 **Mobile-First** - Optimized for clients viewing on mobile devices

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe Checkout
- **Styling**: Tailwind CSS
- **Drag & Drop**: @dnd-kit

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Stripe account

### 1. Clone and Install

```bash
cd rendez
npm install
```

### 2. Set Up Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for webhooks)
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `NEXT_PUBLIC_APP_URL` - Your app URL (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Your Google Maps API key (for place search)

### 3. Set Up Database

Run the SQL migration in your Supabase SQL Editor:

```bash
# Copy contents of supabase/migrations/001_initial_schema.sql
# and run it in Supabase SQL Editor
```

This creates:
- Tables: `profiles`, `tour_templates`, `tour_blocks`, `clients`, `proposals`
- RLS policies for all tables
- `get_public_proposal_by_slug` RPC function for secure public access
- Helper functions for payment and view tracking

### 4. Configure Stripe Webhook

1. In Stripe Dashboard, create a webhook endpoint pointing to:
   ```
   https://your-domain.com/api/stripe/webhook
   ```

2. Subscribe to the `checkout.session.completed` event

3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Set Up Google OAuth (Optional)

Enable Google sign-in for your users:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: Add your Supabase callback URL:
     ```
     https://rdlinfigolnukmqxzuvt.supabase.co/auth/v1/callback
     ```
     (Find your project ref in Supabase Dashboard → Settings → API)
3. Copy the **Client ID** and **Client Secret**

4. In Supabase Dashboard:
   - Go to Authentication → Providers
   - Enable "Google"
     - Paste your **Client ID** and **Client Secret**
     - Click "Save"

5. (Optional) Configure OAuth scopes:
   - Default scopes include: `email`, `profile`
   - These are sufficient for basic user info

**Note:** Users signing in with Google will be automatically redirected to onboarding if they don't have a profile yet.

### 6. Set Up Google Maps Places API (Optional)

The place search feature uses Google Maps Places API. To enable it:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API** (Text Search)
4. Create credentials (API Key)
5. (Recommended) Restrict the API key:
   - Application restrictions: HTTP referrers (for web)
   - API restrictions: Restrict to "Places API" only
6. Add the API key to your `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

**Note:** Without the API key, place search will still work but won't return results. The component will gracefully handle the missing key.

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (login, signup, onboarding)
│   ├── app/              # Authenticated app routes
│   │   ├── tours/        # Tour template management
│   │   ├── proposals/    # Proposal management
│   │   └── profile/      # User profile
│   ├── p/[slug]/         # Public proposal pages
│   └── api/              # API routes (Stripe, view tracking)
├── components/
│   ├── ui/               # Design system components
│   ├── layout/           # Layout components
│   ├── tours/            # Tour editor components
│   └── proposal/         # Proposal renderer
├── lib/
│   └── supabase/         # Supabase client setup
└── types/
    └── database.ts       # TypeScript types
```

## Block Visibility Types

- **Public**: Always visible with full details
- **Vague**: Shows title/description but hides exact venue name
- **Secret**: Completely hidden until payment
- **Reveal**: Shows teaser, reveals details after payment

## Proposal Flow

1. Guide creates tour template with itinerary blocks
2. Guide creates proposal for a client (selects tour, enters client info, sets deposit)
3. Guide shares proposal link with client
4. Client views proposal (status becomes "viewed")
5. Client pays deposit via Stripe
6. Proposal unlocks, revealing all hidden details
7. Client sees full itinerary

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Make sure to update:
- `NEXT_PUBLIC_APP_URL` to your production URL
- Stripe keys to production keys
- Configure Stripe webhook for production URL
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Add your Google Maps API key (if using place search)

### Stripe Connect Setup

**New:** Rendez now supports Stripe Connect for direct payments to guides!

See [DEPLOYMENT_STRIPE_CONNECT.md](./DEPLOYMENT_STRIPE_CONNECT.md) for complete setup instructions.

Quick steps:
1. Run migration `016_stripe_connect.sql` in Supabase
2. Configure Stripe Connect webhook (add `account.updated` event)
3. Set environment variables
4. Deploy and test!

Optional platform fees:
- `STRIPE_PLATFORM_FEE_PERCENT` (e.g., "2.9" for 2.9%)
- `STRIPE_PLATFORM_FEE_FIXED_CENTS` (e.g., "30" for $0.30)

## License

MIT
