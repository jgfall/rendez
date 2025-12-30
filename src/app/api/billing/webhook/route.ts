import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Lemon Squeezy webhook handler
 * Handles subscription events from Lemon Squeezy
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('LEMON_SQUEEZY_WEBHOOK_SECRET is not set');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Lemon Squeezy uses HMAC SHA256 signature
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = hmac.update(body).digest('hex');
    const expectedSignature = `sha256=${digest}`;

    if (signature !== expectedSignature) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventName = event.meta?.event_name;

    console.log('[LEMON SQUEEZY WEBHOOK] Received event:', eventName);

    // Handle different event types
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
        await handleSubscriptionUpdate(event);
        break;
      
      case 'subscription_cancelled':
      case 'subscription_expired':
      case 'subscription_payment_failed':
        await handleSubscriptionCancellation(event);
        break;
      
      case 'subscription_payment_success':
      case 'subscription_payment_recovered':
        await handleSubscriptionPaymentSuccess(event);
        break;
      
      default:
        console.log(`[LEMON SQUEEZY WEBHOOK] Unhandled event: ${eventName}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[LEMON SQUEEZY WEBHOOK] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(event: any) {
  const subscription = event.data;
  const customData = subscription.attributes?.custom_data || {};
  const userId = customData.user_id;

  if (!userId) {
    console.error('[LEMON SQUEEZY WEBHOOK] No user_id in custom_data');
    return;
  }

  const planType = customData.plan_type || 'monthly';
  const status = subscription.attributes.status;
  const variantId = subscription.attributes.variant_id;
  
  // Map Lemon Squeezy status to our subscription status
  let subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid' | null = null;
  
  switch (status) {
    case 'active':
      subscriptionStatus = 'active';
      break;
    case 'cancelled':
      subscriptionStatus = 'canceled';
      break;
    case 'past_due':
      subscriptionStatus = 'past_due';
      break;
    case 'on_trial':
      subscriptionStatus = 'trialing';
      break;
    case 'expired':
      subscriptionStatus = 'incomplete_expired';
      break;
    case 'unpaid':
      subscriptionStatus = 'unpaid';
      break;
  }

  // Calculate period end from renewal date or current period end
  const renewalDate = subscription.attributes.renewals_at;
  const currentPeriodEnd = renewalDate ? new Date(renewalDate).toISOString() : null;

  // Update profile
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_plan: 'pro',
      subscription_status: subscriptionStatus,
      ls_subscription_id: subscription.id.toString(),
      ls_customer_id: subscription.attributes.customer_id?.toString() || null,
      subscription_current_period_end: currentPeriodEnd,
      subscription_cancel_at_period_end: status === 'cancelled' || status === 'on_grace_period',
    })
    .eq('id', userId);

  if (error) {
    console.error('[LEMON SQUEEZY WEBHOOK] Error updating profile:', error);
  } else {
    console.log(`[LEMON SQUEEZY WEBHOOK] Updated subscription for user ${userId}`);
  }
}

async function handleSubscriptionCancellation(event: any) {
  const subscription = event.data;
  const customData = subscription.attributes?.custom_data || {};
  const userId = customData.user_id;

  if (!userId) {
    console.error('[LEMON SQUEEZY WEBHOOK] No user_id in custom_data');
    return;
  }

  // Downgrade to free plan
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_plan: 'free',
      subscription_status: 'canceled',
      subscription_current_period_end: null,
      subscription_cancel_at_period_end: false,
    })
    .eq('id', userId);

  if (error) {
    console.error('[LEMON SQUEEZY WEBHOOK] Error downgrading subscription:', error);
  } else {
    console.log(`[LEMON SQUEEZY WEBHOOK] Downgraded user ${userId} to free plan`);
  }
}

async function handleSubscriptionPaymentSuccess(event: any) {
  const subscription = event.data;
  const customData = subscription.attributes?.custom_data || {};
  const userId = customData.user_id;

  if (!userId) {
    console.error('[LEMON SQUEEZY WEBHOOK] No user_id in custom_data');
    return;
  }

  // Ensure subscription is active
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_plan: 'pro',
      subscription_status: 'active',
    })
    .eq('id', userId);

  if (error) {
    console.error('[LEMON SQUEEZY WEBHOOK] Error updating subscription status:', error);
  }
}

