import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'No Stripe account found' }, { status: 404 });
    }

    // Fetch current account status from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    // Update profile with latest status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_details_submitted: account.details_submitted || false,
        stripe_charges_enabled: account.charges_enabled || false,
        stripe_payouts_enabled: account.payouts_enabled || false,
        stripe_onboarding_completed_at: account.details_submitted && account.payouts_enabled
          ? new Date().toISOString()
          : null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating Stripe status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: {
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      },
    });
  } catch (error: any) {
    console.error('Error syncing Stripe status:', error);
    return NextResponse.json(
      { error: 'Failed to sync Stripe status', details: error?.message },
      { status: 500 }
    );
  }
}

