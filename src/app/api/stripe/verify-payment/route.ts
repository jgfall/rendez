import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Use service role for database updates (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Manual verification endpoint for payments
 * This can be called to verify and update payment status if webhook fails
 * 
 * Usage: POST /api/stripe/verify-payment
 * Body: { session_id: "cs_..." }
 */
export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id as string);

    console.log('[VERIFY] Checking session:', {
      session_id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata,
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        verified: false,
        payment_status: session.payment_status,
        message: 'Payment not completed',
      });
    }

    if (!session.metadata?.proposal_id) {
      return NextResponse.json({
        verified: false,
        message: 'No proposal_id in metadata',
      });
    }

    const proposalId = session.metadata.proposal_id;
    const paymentType = session.metadata.payment_type || 'deposit';

    // Check current status in database
    const { data: existingProposal, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('deposit_paid_at, remainder_paid_at, stripe_checkout_session_id, stripe_remainder_session_id')
      .eq('id', proposalId)
      .single();

    if (fetchError) {
      console.error('[VERIFY] Error fetching proposal:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
    }

    if (!existingProposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const alreadyPaid = paymentType === 'remainder' 
      ? existingProposal.remainder_paid_at 
      : existingProposal.deposit_paid_at;

    if (alreadyPaid) {
      return NextResponse.json({
        verified: true,
        already_paid: true,
        message: 'Payment already recorded',
        deposit_paid_at: existingProposal.deposit_paid_at,
        remainder_paid_at: existingProposal.remainder_paid_at,
      });
    }

    // Update the proposal
    if (paymentType === 'remainder') {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('proposals')
        .update({
          remainder_paid_at: new Date().toISOString(),
          stripe_remainder_session_id: session.id,
          stripe_remainder_payment_intent_id: session.payment_intent as string || null,
        })
        .eq('id', proposalId)
        .select();

      if (updateError) {
        console.error('[VERIFY] Error updating remainder:', updateError);
        return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
      }

      return NextResponse.json({
        verified: true,
        updated: true,
        message: 'Remainder payment recorded',
        proposal_id: proposalId,
        session_id: session.id,
      });
    } else {
      // Get customer ID from payment intent
      let customerId: string | null = null;
      if (session.payment_intent) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            session.payment_intent as string
          );
          customerId = paymentIntent.customer as string | null;
        } catch (err) {
          console.error('[VERIFY] Error retrieving customer ID:', err);
        }
      } else if (session.customer) {
        customerId = session.customer as string;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('proposals')
        .update({
          deposit_paid_at: new Date().toISOString(),
          status: 'deposit_paid',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string || null,
          stripe_customer_id: customerId,
        })
        .eq('id', proposalId)
        .select();

      if (updateError) {
        console.error('[VERIFY] Error updating deposit:', updateError);
        return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
      }

      return NextResponse.json({
        verified: true,
        updated: true,
        message: 'Deposit payment recorded',
        proposal_id: proposalId,
        session_id: session.id,
        customer_id: customerId,
      });
    }
  } catch (error) {
    console.error('[VERIFY] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

