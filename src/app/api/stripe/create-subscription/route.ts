import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Stripe Product ID from user
const STRIPE_PRODUCT_ID = 'prod_ThAimwPWn8a5ux';

// Price IDs - you'll need to get these from Stripe Dashboard
// Monthly: $29/month
// Yearly: $274/year (approximately $22.83/month)
// These should be set as environment variables or fetched from Stripe
const STRIPE_PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY || ''; // Set this in your .env
const STRIPE_PRICE_ID_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY || ''; // Set this in your .env

export async function POST(request: NextRequest) {
  try {
    const { planType } = await request.json(); // 'monthly' or 'yearly'
    
    if (!planType || (planType !== 'monthly' && planType !== 'yearly')) {
      return NextResponse.json({ error: 'Invalid plan type. Must be "monthly" or "yearly"' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const priceId = planType === 'monthly' ? STRIPE_PRICE_ID_MONTHLY : STRIPE_PRICE_ID_YEARLY;

    if (!priceId) {
      return NextResponse.json({ 
        error: 'Price ID not configured. Please set STRIPE_PRICE_ID_MONTHLY and STRIPE_PRICE_ID_YEARLY environment variables.' 
      }, { status: 500 });
    }

    let customerId = profile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          user_id: user.id,
        },
      });

      customerId = customer.id;

      // Store customer ID in database
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan_type: planType,
      },
      success_url: `${appUrl}/app/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app/settings/subscription?canceled=true`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: planType,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

