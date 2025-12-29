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

