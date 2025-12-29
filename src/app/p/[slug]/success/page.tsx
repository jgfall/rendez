import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight, PartyPopper } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card } from '@/components/ui';
import { CalendarButton } from './calendar-button';
import { ShareButton } from './share-button';
import type { PublicProposal } from '@/types/database';
import type { CalendarEvent } from '@/lib/calendar';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function SuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { session_id, remainder, test } = await searchParams;
  const supabase = await createClient();

  // If we have a session_id and it's not a test, verify payment and update if needed
  // This handles cases where the webhook hasn't processed yet
  if (session_id && !test && session_id !== 'test_deposit' && session_id !== 'test_remainder') {
    try {
      const stripe = (await import('stripe')).default;
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!);
      
      // Use service role for database updates (bypasses RLS)
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );
      
      // Retrieve the checkout session
      const session = await stripeClient.checkout.sessions.retrieve(session_id as string);
      
      console.log('[SUCCESS PAGE] Verifying payment:', {
        session_id: session.id,
        payment_status: session.payment_status,
        metadata: session.metadata,
      });
      
      if (session.payment_status === 'paid' && session.metadata?.proposal_id) {
        const proposalId = session.metadata.proposal_id;
        const paymentType = session.metadata.payment_type || 'deposit';
        
        // Check if already updated (idempotency)
        const { data: existingProposal } = await supabaseAdmin
          .from('proposals')
          .select(paymentType === 'remainder' ? 'remainder_paid_at' : 'deposit_paid_at')
          .eq('id', proposalId)
          .single();
        
        const alreadyPaid = paymentType === 'remainder' 
          ? existingProposal?.remainder_paid_at 
          : existingProposal?.deposit_paid_at;
        
        if (!alreadyPaid) {
          console.log(`[SUCCESS PAGE] Updating ${paymentType} payment for proposal ${proposalId}`);
          
          // Update the proposal directly (webhook might not have fired yet)
          if (paymentType === 'remainder') {
            const { error: updateError } = await supabaseAdmin
              .from('proposals')
              .update({
                remainder_paid_at: new Date().toISOString(),
                stripe_remainder_session_id: session.id,
                stripe_remainder_payment_intent_id: session.payment_intent as string || null,
              })
              .eq('id', proposalId);
            
            if (updateError) {
              console.error('[SUCCESS PAGE] Error updating remainder:', updateError);
            } else {
              console.log(`[SUCCESS PAGE] Successfully updated remainder payment for proposal ${proposalId}`);
            }
          } else {
            // Get customer ID from payment intent
            let customerId: string | null = null;
            if (session.payment_intent) {
              try {
                const paymentIntent = await stripeClient.paymentIntents.retrieve(
                  session.payment_intent as string
                );
                customerId = paymentIntent.customer as string | null;
                console.log(`[SUCCESS PAGE] Retrieved customer ID: ${customerId}`);
              } catch (err) {
                console.error('[SUCCESS PAGE] Error retrieving customer ID:', err);
              }
            } else if (session.customer) {
              customerId = session.customer as string;
              console.log(`[SUCCESS PAGE] Using customer ID from session: ${customerId}`);
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
            
            const { error: updateError } = await supabaseAdmin
              .from('proposals')
              .update(updateData)
              .eq('id', proposalId);
            
            if (updateError) {
              console.error('[SUCCESS PAGE] Error updating deposit:', updateError);
            } else {
              console.log(`[SUCCESS PAGE] Successfully updated deposit payment for proposal ${proposalId}`);
            }
          }
        } else {
          console.log(`[SUCCESS PAGE] Payment already recorded for proposal ${proposalId}`);
        }
      } else {
        console.log('[SUCCESS PAGE] Payment not completed or missing metadata:', {
          payment_status: session.payment_status,
          has_metadata: !!session.metadata,
        });
      }
    } catch (err) {
      console.error('[SUCCESS PAGE] Error verifying payment:', err);
      // Don't fail the page if verification fails - webhook will handle it
    }
  }

  // Fetch proposal to verify it exists and is paid
  const { data, error } = await supabase
    .rpc('get_public_proposal_by_slug', { slug_param: slug });

  if (error || !data) {
    notFound();
  }

  const proposal = data as PublicProposal;
  
  const isRemainder = remainder === 'true';
  const isTest = test === 'true';

  // Prepare calendar event
  const scheduledDate = proposal.scheduled_at ? new Date(proposal.scheduled_at) : null;
  const endDate = scheduledDate && proposal.tour.duration_minutes
    ? new Date(scheduledDate.getTime() + proposal.tour.duration_minutes * 60 * 1000)
    : scheduledDate
    ? new Date(scheduledDate.getTime() + 3 * 60 * 60 * 1000) // Default 3 hours
    : null;

  const calendarEvent = scheduledDate && endDate ? {
    title: proposal.tour.name,
    description: proposal.tour.description || `Tour with ${proposal.guide.business_name || proposal.guide.full_name || 'your guide'}`,
    location: proposal.tour.city || 'Tour Location',
    startDate: scheduledDate,
    endDate: endDate,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/${slug}`,
  } : null;

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-12">
      {/* Background celebration effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 mb-6">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>

        <h1 className="font-display text-3xl font-bold text-sand-900 mb-3">
          {isRemainder ? 'Payment Complete! ✅' : 'You\'re All Set! 🎉'}
        </h1>

        <p className="text-lg text-sand-600 mb-8">
          {isRemainder 
            ? 'Your remainder payment has been received. Thank you!'
            : 'Your deposit has been received and your tour is confirmed.'
          }
          {isTest && (
            <span className="block mt-2 text-sm text-sand-500">
              (Test Mode - No actual payment processed)
            </span>
          )}
        </p>

        <Card variant="elevated" padding="lg" className="mb-8 text-left">
          <h2 className="font-display text-2xl font-semibold text-sand-900 mb-4">
            {proposal.tour.name}
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-sand-500">Guest</span>
              <span className="text-sand-900 font-medium">{proposal.client.name}</span>
            </div>
            {proposal.tour.city && (
              <div className="flex justify-between">
                <span className="text-sand-500">Location</span>
                <span className="text-sand-900 font-medium">{proposal.tour.city}</span>
              </div>
            )}
            {proposal.scheduled_at && (
              <div className="flex justify-between">
                <span className="text-sand-500">Date</span>
                <span className="text-sand-900 font-medium">
                  {new Date(proposal.scheduled_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-sm text-emerald-700 flex items-center gap-2">
              <PartyPopper className="h-4 w-4" />
              <span>
                <strong>Unlocked!</strong> All tour details are now visible in your proposal.
              </span>
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          <Link href={`/p/${slug}`} className="block">
            <Button size="lg" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
              View Itinerary
            </Button>
          </Link>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <CalendarButton event={calendarEvent as CalendarEvent | null} isRemainder={isRemainder} />
            </div>
            <div className="flex-1">
              <ShareButton slug={slug} tourName={proposal.tour.name} />
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-sand-500">
          Your guide will reach out with more details soon.
        </p>
      </div>
    </div>
  );
}

