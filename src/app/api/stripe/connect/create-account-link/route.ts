import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe account ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe account found. Please create an account first.' },
        { status: 400 }
      );
    }

    // Create account link for onboarding or refresh
    const accountLink = await stripe.accountLinks.create({
      account: profile.stripe_account_id,
      refresh_url: refresh_url,
      return_url: return_url,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating account link:', error);
    return NextResponse.json(
      { error: 'Failed to create account link' },
      { status: 500 }
    );
  }
}

