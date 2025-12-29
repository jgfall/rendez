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
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    
    // Update guide's Stripe Connect status
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        stripe_details_submitted: account.details_submitted || false,
        stripe_charges_enabled: account.charges_enabled || false,
        stripe_payouts_enabled: account.payouts_enabled || false,
        stripe_onboarding_completed_at: account.details_submitted 
          ? (account.payouts_enabled ? new Date().toISOString() : null)
          : null,
      })
      .eq('stripe_account_id', account.id);

    if (error) {
      console.error('Error updating Stripe account status:', error);
    } else {
      console.log(`Stripe account status updated for account ${account.id}`);
    }
  } else if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    console.log('[WEBHOOK] checkout.session.completed received:', {
      session_id: session.id,
      metadata: session.metadata,
      payment_status: session.payment_status,
      payment_intent: session.payment_intent,
    });
    
    const proposalId = session.metadata?.proposal_id;
    const paymentType = session.metadata?.payment_type || 'deposit';
    
    if (!proposalId) {
      console.error('[WEBHOOK] No proposal_id in session metadata:', session.metadata);
      return NextResponse.json({ error: 'Missing proposal_id' }, { status: 400 });
    }

    // Only process if payment was successful
    if (session.payment_status !== 'paid') {
      console.log(`[WEBHOOK] Payment not completed for proposal ${proposalId}, status: ${session.payment_status}`);
      return NextResponse.json({ received: true, skipped: 'payment_not_completed' });
    }

    if (paymentType === 'remainder') {
      // Update remainder payment
      const { data: updated, error } = await supabaseAdmin
        .from('proposals')
        .update({
          remainder_paid_at: new Date().toISOString(),
          stripe_remainder_session_id: session.id,
          stripe_remainder_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', proposalId)
        .is('remainder_paid_at', null) // Idempotency check
        .select();

      if (error) {
        console.error('[WEBHOOK] Error updating remainder payment:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      } else if (!updated || updated.length === 0) {
        console.log(`[WEBHOOK] Remainder already paid for proposal ${proposalId} (idempotency)`);
      } else {
        console.log(`[WEBHOOK] Remainder payment processed for proposal ${proposalId}`);
      }
    } else {
      // Update deposit payment
      // Retrieve customer ID and payment method from payment intent for future charges
      let customerId: string | null = null;
      let paymentMethodId: string | null = null;
      
      if (session.payment_intent) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            session.payment_intent as string
          );
          customerId = paymentIntent.customer as string | null;
          paymentMethodId = paymentIntent.payment_method as string | null;
          
          console.log(`[WEBHOOK] Retrieved customer ID: ${customerId} and payment method: ${paymentMethodId} from payment intent ${session.payment_intent}`);
          
          // If we have both customer ID and payment method, attach the payment method to the customer
          // This ensures it can be reused for future off-session charges
          if (customerId && paymentMethodId) {
            try {
              // Attach the payment method to the customer if it's not already attached
              await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
              });
              console.log(`[WEBHOOK] Attached payment method ${paymentMethodId} to customer ${customerId}`);
            } catch (attachErr: any) {
              // If already attached, that's fine - just log it
              if (attachErr.code === 'resource_already_exists') {
                console.log(`[WEBHOOK] Payment method ${paymentMethodId} already attached to customer ${customerId}`);
              } else {
                console.error('[WEBHOOK] Error attaching payment method to customer:', attachErr);
              }
            }
          }
        } catch (err) {
          console.error('[WEBHOOK] Error retrieving payment intent:', err);
          // Don't fail the webhook if we can't get customer ID - it's optional
        }
      } else {
        // Try to get customer from session directly
        customerId = session.customer as string | null;
        console.log(`[WEBHOOK] Using customer ID from session: ${customerId}`);
      }

      // Build update object - only include stripe_customer_id if we have it
      const updateData: any = {
        deposit_paid_at: new Date().toISOString(),
        status: 'deposit_paid',
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string || null,
      };
      
      // Only add stripe_customer_id if customerId exists (and column exists)
      if (customerId) {
        updateData.stripe_customer_id = customerId;
      }
      
      const { data: updated, error } = await supabaseAdmin
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId)
        .is('deposit_paid_at', null) // Idempotency check
        .select();

      if (error) {
        console.error('[WEBHOOK] Error updating proposal:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      } else if (!updated || updated.length === 0) {
        console.log(`[WEBHOOK] Deposit already paid for proposal ${proposalId} (idempotency)`);
      } else {
        console.log(`[WEBHOOK] Deposit payment processed for proposal ${proposalId}${customerId ? ` (customer: ${customerId})` : ''}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}

