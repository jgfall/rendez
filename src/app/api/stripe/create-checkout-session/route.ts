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

    // Get guide's currency
    const { data: profile } = await supabase
      .from('profiles')
      .select('currency')
      .eq('id', proposal.guide_id)
      .single();

    const currency = (profile?.currency || 'USD').toLowerCase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // TEST MODE: Bypass Stripe for testing
    if (isTest || process.env.NODE_ENV === 'development') {
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

      const session = await stripe.checkout.sessions.create({
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
        },
        customer_email: proposal.client?.email || undefined,
        success_url: `${appUrl}/p/${slug}/success?session_id={CHECKOUT_SESSION_ID}&remainder=true`,
        cancel_url: `${appUrl}/p/${slug}`,
      });

      return NextResponse.json({ url: session.url });
    } else {
      // Create deposit checkout
      if (proposal.deposit_paid_at) {
        return NextResponse.json({ error: 'Deposit already paid' }, { status: 400 });
      }

    const session = await stripe.checkout.sessions.create({
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
      },
      customer_email: proposal.client?.email || undefined,
      success_url: `${appUrl}/p/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/p/${slug}`,
    });

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
