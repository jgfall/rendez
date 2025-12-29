import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface ProposalWithRelations {
  id: string;
  slug: string;
  deposit_cents: number;
  deposit_paid_at: string | null;
  guide_id: string;
  tour: { name: string } | null;
  client: { name: string; email: string | null } | null;
}

export async function POST(request: NextRequest) {
  try {
    const { slug, isTest = false, isRemainder = false } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch proposal with guide profile for currency
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        id,
        slug,
        deposit_cents,
        remainder_cents,
        deposit_paid_at,
        remainder_paid_at,
        guide_id,
        tour:tour_templates(name),
        client:clients(name, email)
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Type assertion for the nested relations
    const proposal = data as unknown as ProposalWithRelations & {
      remainder_cents: number | null;
      remainder_paid_at: string | null;
    };

    // Get guide's profile with Stripe Connect info and subscription plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('currency, stripe_account_id, stripe_charges_enabled, subscription_plan')
      .eq('id', proposal.guide_id)
      .single();

    const currency = (profile?.currency || 'USD').toLowerCase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Check if guide has Stripe Connect enabled
    // Use Connect if guide has it set up (works in both test and production with appropriate Stripe keys)
    const useConnect = profile?.stripe_account_id && profile?.stripe_charges_enabled;

    // In production, require Connect for payments
    if (process.env.NODE_ENV === 'production' && !useConnect) {
      return NextResponse.json(
        { error: 'Guide has not enabled payments. Please contact the guide.' },
        { status: 400 }
      );
    }

    // Calculate platform fee based on subscription plan
    // Free plans: 3% platform fee (on top of Stripe fees)
    // Pro plans: 0% platform fee (only Stripe fees)
    const subscriptionPlan = (profile?.subscription_plan || 'free') as 'free' | 'pro';
    let platformFeePercent: number | null = null;
    
    if (subscriptionPlan === 'free') {
      // Free plan: 3% platform fee
      platformFeePercent = 3.0;
    } else {
      // Pro plan: no platform fee (can still use env var override if needed)
      platformFeePercent = process.env.STRIPE_PLATFORM_FEE_PERCENT 
        ? parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT) 
        : null;
    }
    
    const platformFeeFixedCents = process.env.STRIPE_PLATFORM_FEE_FIXED_CENTS
      ? parseInt(process.env.STRIPE_PLATFORM_FEE_FIXED_CENTS)
      : null;

    // TEST MODE: Only bypass Stripe if explicitly in test mode AND guide doesn't have Connect enabled
    // If guide has Connect enabled, always use real Stripe Checkout (even in development with test keys)
    const shouldBypassStripe = isTest && !useConnect;
    
    if (shouldBypassStripe) {
      if (isRemainder) {
        // Test remainder payment
        if (proposal.remainder_paid_at) {
          return NextResponse.json({ error: 'Remainder already paid' }, { status: 400 });
        }
        if (!proposal.remainder_cents) {
          return NextResponse.json({ error: 'No remainder amount set' }, { status: 400 });
        }

        // Simulate payment by updating directly
        const { error: updateError } = await supabase
          .from('proposals')
          .update({
            remainder_paid_at: new Date().toISOString(),
            stripe_remainder_session_id: `test_session_${Date.now()}`,
            stripe_remainder_payment_intent_id: `test_pi_${Date.now()}`,
          })
          .eq('id', proposal.id);

        if (updateError) {
          return NextResponse.json({ error: 'Failed to process test payment' }, { status: 500 });
        }

        return NextResponse.json({ 
          url: `${appUrl}/p/${slug}/success?session_id=test_remainder&test=true&remainder=true`
        });
      } else {
        // Test deposit payment
    if (proposal.deposit_paid_at) {
      return NextResponse.json({ error: 'Deposit already paid' }, { status: 400 });
    }

        // Simulate payment by updating directly
        const { error: updateError } = await supabase
          .from('proposals')
          .update({
            deposit_paid_at: new Date().toISOString(),
            status: 'deposit_paid',
            stripe_checkout_session_id: `test_session_${Date.now()}`,
            stripe_payment_intent_id: `test_pi_${Date.now()}`,
          })
          .eq('id', proposal.id);

        if (updateError) {
          return NextResponse.json({ error: 'Failed to process test payment' }, { status: 500 });
        }

        return NextResponse.json({ 
          url: `${appUrl}/p/${slug}/success?session_id=test_deposit&test=true`
        });
      }
    }

    // PRODUCTION: Use real Stripe
    if (isRemainder) {
      // Create remainder payment checkout
      if (proposal.remainder_paid_at) {
        return NextResponse.json({ error: 'Remainder already paid' }, { status: 400 });
      }
      if (!proposal.remainder_cents) {
        return NextResponse.json({ error: 'No remainder amount set' }, { status: 400 });
      }

      // Calculate platform fee if enabled
      let applicationFeeAmount: number | undefined;
      if (useConnect && profile?.stripe_account_id) {
        if (platformFeePercent) {
          applicationFeeAmount = Math.round(proposal.remainder_cents * (platformFeePercent / 100));
        } else if (platformFeeFixedCents) {
          applicationFeeAmount = platformFeeFixedCents;
        }
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: `Remainder: ${proposal.tour?.name || 'Tour'}`,
                description: `Remaining balance for ${proposal.client?.name}`,
              },
              unit_amount: proposal.remainder_cents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          proposal_id: proposal.id,
          slug: proposal.slug,
          payment_type: 'remainder',
          guide_id: proposal.guide_id,
        },
        customer_email: proposal.client?.email || undefined,
        success_url: `${appUrl}/p/${slug}/success?session_id={CHECKOUT_SESSION_ID}&remainder=true`,
        cancel_url: `${appUrl}/p/${slug}`,
      };

      // Add Connect destination and fee if enabled
      if (useConnect && profile?.stripe_account_id) {
        sessionParams.payment_intent_data = {
          transfer_data: {
            destination: profile.stripe_account_id,
          },
          // Save payment method for future off-session charges
          setup_future_usage: 'off_session',
        };
        if (applicationFeeAmount) {
          sessionParams.payment_intent_data.application_fee_amount = applicationFeeAmount;
        }
      } else {
        // Even without Connect, save payment method for future charges
        sessionParams.payment_intent_data = {
          setup_future_usage: 'off_session',
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      return NextResponse.json({ url: session.url });
    } else {
      // Create deposit checkout
      if (proposal.deposit_paid_at) {
        return NextResponse.json({ error: 'Deposit already paid' }, { status: 400 });
      }

      // Calculate platform fee if enabled
      let applicationFeeAmount: number | undefined;
      if (useConnect && profile?.stripe_account_id) {
        if (platformFeePercent) {
          applicationFeeAmount = Math.round(proposal.deposit_cents * (platformFeePercent / 100));
        } else if (platformFeeFixedCents) {
          applicationFeeAmount = platformFeeFixedCents;
        }
      }

      // Check if we already have a customer ID for this proposal (from previous payment attempts)
      let existingCustomerId: string | null = null;
      if (!isRemainder) {
        const { data: existingProposal } = await supabase
          .from('proposals')
          .select('stripe_customer_id')
          .eq('slug', slug)
          .single();
        existingCustomerId = existingProposal?.stripe_customer_id || null;
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
              currency: currency,
            product_data: {
              name: `Deposit: ${proposal.tour?.name || 'Tour'}`,
              description: `Tour deposit for ${proposal.client?.name}`,
            },
              unit_amount: proposal.deposit_cents, // Already in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        proposal_id: proposal.id,
        slug: proposal.slug,
          payment_type: 'deposit',
          guide_id: proposal.guide_id,
      },
      // Use existing customer if available, otherwise use email to create one
      customer: existingCustomerId || undefined,
      customer_email: !existingCustomerId ? (proposal.client?.email || undefined) : undefined,
      success_url: `${appUrl}/p/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/p/${slug}`,
      };

      // Add Connect destination and fee if enabled
      if (useConnect && profile?.stripe_account_id) {
        sessionParams.payment_intent_data = {
          transfer_data: {
            destination: profile.stripe_account_id,
          },
          // Save payment method for future off-session charges (remainder payments)
          setup_future_usage: 'off_session',
        };
        if (applicationFeeAmount) {
          sessionParams.payment_intent_data.application_fee_amount = applicationFeeAmount;
        }
      } else {
        // Even without Connect, save payment method for future charges
        sessionParams.payment_intent_data = {
          setup_future_usage: 'off_session',
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
