import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { method, amount, paymentMethodId, bankAccountId } = await request.json();

    if (!method || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (method === 'instant' && !paymentMethodId) {
      return NextResponse.json({ error: 'Payment method required for instant payout' }, { status: 400 });
    }

    if (method === 'bank' && !bankAccountId) {
      return NextResponse.json({ error: 'Bank account required for bank transfer' }, { status: 400 });
    }

    // Get guide's currency
    const { data: profile } = await supabase
      .from('profiles')
      .select('currency')
      .eq('id', user.id)
      .single();

    const currency = profile?.currency || 'USD';

    // Calculate fees for instant payout
    let feeCents = 0;
    let netAmountCents = amount;
    
    if (method === 'instant') {
      // Instant payout fee: 1.5% + $0.25 (or equivalent in other currencies)
      // amount is already in cents
      const feePercent = 0.015;
      const feeFixedCents = 25; // $0.25 = 25 cents
      feeCents = Math.round(amount * feePercent) + feeFixedCents;
      netAmountCents = amount - feeCents;
      
      if (netAmountCents < 0) {
        return NextResponse.json(
          { error: 'Amount too small to cover fees' },
          { status: 400 }
        );
      }
    }

    // Verify available funds
    const { data: proposals } = await supabase
      .from('proposals')
      .select('deposit_cents, remainder_cents, completed_at, deposit_paid_at, remainder_paid_at')
      .eq('guide_id', user.id);

    // Deposits can be cashed out as soon as they're paid, even if tour isn't completed
    const allPaidDeposits = proposals?.filter(p => p.deposit_paid_at).reduce((sum, p) => sum + (p.deposit_cents || 0), 0) || 0;
    
    // Remainders from completed tours (since they're paid after completion)
    // Include tours that are marked complete with remainder_cents set
    // Note: remainder_paid_at may not be set yet if automatic charging isn't implemented,
    // but the remainder amount should still be available once the tour is marked complete
    const completedTours = proposals?.filter(p => p.completed_at) || [];
    const completedRemainders = completedTours
      .filter(p => p.remainder_cents && p.remainder_cents > 0) // Include if remainder_cents is set
      .reduce((sum, p) => sum + (p.remainder_cents || 0), 0);
    const grossAvailable = allPaidDeposits + completedRemainders;

    // Get total cashed out (includes pending, processing, and completed payouts)
    const { data: cashedOutAmount, error: cashedOutError } = await supabase
      .rpc('get_total_cashed_out', { guide_id_param: user.id });

    if (cashedOutError) {
      console.error('Error getting cashed out amount:', cashedOutError);
      return NextResponse.json(
        { error: 'Failed to verify available funds' },
        { status: 500 }
      );
    }

    const available = Math.max(0, grossAvailable - (cashedOutAmount || 0));

    // Check for existing pending payouts
    const { data: pendingPayouts } = await supabase
      .from('payouts')
      .select('id, amount_cents, net_amount_cents, status, created_at')
      .eq('guide_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Log for debugging
    console.log('Cash out validation:', {
      grossAvailable,
      cashedOutAmount: cashedOutAmount || 0,
      available,
      requested: amount,
      completedToursCount: completedTours.length,
      pendingPayoutsCount: pendingPayouts?.length || 0
    });

    // If available is 0 and there are pending payouts, provide helpful message
    if (available === 0 && pendingPayouts && pendingPayouts.length > 0) {
      return NextResponse.json(
        { 
          error: 'All available funds are already in a pending payout. Please refresh the page to see current status.',
          details: {
            available,
            requested: amount,
            grossAvailable,
            cashedOut: cashedOutAmount || 0,
            pendingPayoutsCount: pendingPayouts.length
          }
        },
        { status: 400 }
      );
    }

    // Allow a small tolerance for rounding differences (1 cent)
    if (amount > available + 1) {
      return NextResponse.json(
        { 
          error: 'Insufficient funds available for cash out',
          details: {
            available,
            requested: amount,
            grossAvailable,
            cashedOut: cashedOutAmount || 0,
            pendingPayoutsCount: pendingPayouts?.length || 0
          }
        },
        { status: 400 }
      );
    }

    // Create payout record (use service role to bypass RLS)
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .insert({
        guide_id: user.id,
        amount_cents: amount,
        method: method as 'instant' | 'bank',
        status: 'pending',
        payment_method_id: paymentMethodId || null,
        bank_account_id: bankAccountId || null,
        fee_cents: feeCents,
        net_amount_cents: netAmountCents,
        currency,
      })
      .select()
      .single();

    if (payoutError) {
      console.error('Error creating payout:', payoutError);
      return NextResponse.json(
        { error: 'Failed to create payout record' },
        { status: 500 }
      );
    }

    // TODO: Integrate with Stripe Connect or other payment provider
    // For now, we just create the payout record
    // In production, you would:
    // 1. For instant: Use Stripe Transfer to payment method
    // 2. For bank: Use Stripe Payouts API
    // 3. Update payout status based on webhook events

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount_cents: payout.amount_cents,
        net_amount_cents: payout.net_amount_cents,
        fee_cents: payout.fee_cents,
        method: payout.method,
        status: payout.status,
      },
    });
  } catch (error) {
    console.error('Cash out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

