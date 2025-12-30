import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Check for Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const { return_url, refresh_url } = await request.json();

    if (!return_url || !refresh_url) {
      return NextResponse.json(
        { error: 'return_url and refresh_url are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe account ID and status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_details_submitted, stripe_charges_enabled')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    if (!profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe account found. Please create an account first.' },
        { status: 400 }
      );
    }

    // Verify the account exists in Stripe
    let stripeAccount: Stripe.Account;
    try {
      stripeAccount = await stripe.accounts.retrieve(profile.stripe_account_id);
    } catch (stripeError: any) {
      console.error('Error retrieving Stripe account:', stripeError);
      return NextResponse.json(
        { 
          error: 'Invalid Stripe account',
          details: stripeError.message || 'Account not found in Stripe'
        },
        { status: 400 }
      );
    }

    // For Express accounts, always use account_onboarding
    // This works for both initial setup and completing missing information
    let accountLink: Stripe.AccountLink;
    try {
      accountLink = await stripe.accountLinks.create({
      account: profile.stripe_account_id,
      refresh_url: refresh_url,
      return_url: return_url,
      type: 'account_onboarding',
    });
    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError);
      return NextResponse.json(
        { 
          error: 'Failed to create account link',
          details: stripeError.message || 'Unknown Stripe error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Error creating account link:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create account link',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

