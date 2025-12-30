import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear Stripe account ID to allow creating a new account
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: null,
        stripe_details_submitted: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_onboarding_completed_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error resetting Stripe account:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset account', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Stripe account reset. You can now create a new account.' });
  } catch (error: any) {
    console.error('Error resetting Stripe account:', error);
    return NextResponse.json(
      { error: 'Failed to reset account', details: error?.message },
      { status: 500 }
    );
  }
}

