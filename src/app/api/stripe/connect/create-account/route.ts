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

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a Stripe account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_account_id) {
      return NextResponse.json({ 
        stripe_account_id: profile.stripe_account_id 
      });
    }

    // Get user's country from profile (default to US if not set)
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('currency')
      .eq('id', user.id)
      .single();

    // Infer country from currency (simplified mapping)
    // In production, you might want to add a country field to profiles
    const countryMap: Record<string, string> = {
      'USD': 'US',
      'EUR': 'DE', // Default to Germany for EUR, but could be any EU country
      'GBP': 'GB',
      'JPY': 'JP',
      'AUD': 'AU',
      'CAD': 'CA',
      'CHF': 'CH',
      'MXN': 'MX',
      'BRL': 'BR',
      'SGD': 'SG',
      'AED': 'AE',
      'NZD': 'NZ',
    };

    const currency = fullProfile?.currency || 'USD';
    const country = countryMap[currency] || 'US';

    // Create Express account
    let account: Stripe.Account;
    try {
      account = await stripe.accounts.create({
      type: 'express',
      country: country as any,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      email: user.email || undefined,
    });
    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError);
      return NextResponse.json(
        { 
          error: 'Failed to create Stripe account',
          details: stripeError.message || 'Unknown Stripe error'
        },
        { status: 500 }
      );
    }

    // Store account ID in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_account_id: account.id })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error storing stripe_account_id:', updateError);
      return NextResponse.json(
        { error: 'Failed to store account ID' },
        { status: 500 }
      );
    }

    return NextResponse.json({ stripe_account_id: account.id });
  } catch (error: any) {
    console.error('Error creating Stripe account:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create Stripe account',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

