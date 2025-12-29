import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Use service role for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const proposalId = session.metadata?.proposal_id;
    const paymentType = session.metadata?.payment_type || 'deposit';
    
    if (!proposalId) {
      console.error('No proposal_id in session metadata');
      return NextResponse.json({ error: 'Missing proposal_id' }, { status: 400 });
    }

    if (paymentType === 'remainder') {
      // Update remainder payment
      const { error } = await supabaseAdmin
        .from('proposals')
        .update({
          remainder_paid_at: new Date().toISOString(),
          stripe_remainder_session_id: session.id,
          stripe_remainder_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', proposalId)
        .is('remainder_paid_at', null); // Idempotency check

      if (error) {
        console.error('Error updating remainder payment:', error);
      } else {
        console.log(`Remainder payment processed for proposal ${proposalId}`);
      }
    } else {
      // Update deposit payment
    const { error } = await supabaseAdmin
      .from('proposals')
      .update({
        deposit_paid_at: new Date().toISOString(),
        status: 'deposit_paid',
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq('id', proposalId)
      .is('deposit_paid_at', null); // Idempotency check

    if (error) {
      console.error('Error updating proposal:', error);
      } else {
        console.log(`Deposit payment processed for proposal ${proposalId}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}

