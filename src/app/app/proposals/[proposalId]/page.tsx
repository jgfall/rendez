import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Copy, MessageCircle, Calendar, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, Badge, ProposalStatusBadge } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { CopyActions } from './copy-actions';
import { CompleteActions } from './complete-actions';

interface PageProps {
  params: Promise<{ proposalId: string }>;
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { proposalId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: proposal } = await supabase
    .from('proposals')
    .select(`
      *,
      tour:tour_templates(*),
      client:clients(*)
    `)
    .eq('id', proposalId)
    .eq('guide_id', user!.id)
    .single();

  if (!proposal) {
    notFound();
  }

  // Get user currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user!.id)
    .single();

  const currency = profile?.currency || 'USD';

  const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/${proposal.slug}`;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/proposals">
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
      </div>

      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-2xl font-bold text-sand-900">
              {proposal.client?.name}
            </h1>
            <ProposalStatusBadge status={proposal.status} />
          </div>
          <p className="text-sand-600">
            {proposal.tour?.name}
            {proposal.tour?.city && ` • ${proposal.tour.city}`}
          </p>
        </div>
        <a
          href={proposalUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" icon={<ExternalLink className="h-4 w-4" />}>
            View Proposal
          </Button>
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick stats */}
        <Card variant="elevated" padding="lg">
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
            Details
          </h2>
          <div className="space-y-4">
            {proposal.scheduled_at && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sand-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-sand-600" />
                </div>
                <div>
                  <p className="text-sm text-sand-500">Scheduled</p>
                  <p className="font-medium text-sand-900">
                    {format(new Date(proposal.scheduled_at), 'EEEE, MMMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            )}
            {proposal.group_size && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sand-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-sand-600" />
                </div>
                <div>
                  <p className="text-sm text-sand-500">Group Size</p>
                  <p className="font-medium text-sand-900">{proposal.group_size} people</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sand-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-sand-600" />
              </div>
              <div>
                <p className="text-sm text-sand-500">
                  {proposal.total_price_cents ? 'Total / Deposit' : 'Deposit'}
                </p>
                <p className="font-medium text-sand-900">
                  {proposal.total_price_cents 
                    ? `${formatPrice(proposal.total_price_cents / 100, currency)} / ${formatPrice(proposal.deposit_cents / 100, currency)}`
                    : formatPrice(proposal.deposit_cents / 100, currency)
                  }
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Client info */}
        <Card variant="elevated" padding="lg">
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
            Client
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-sand-500">Name</p>
              <p className="font-medium text-sand-900">{proposal.client?.name}</p>
            </div>
            {proposal.client?.email && (
              <div>
                <p className="text-sm text-sand-500">Email</p>
                <p className="text-sand-900">{proposal.client.email}</p>
              </div>
            )}
            {proposal.client?.phone && (
              <div>
                <p className="text-sm text-sand-500">Phone</p>
                <p className="text-sand-900">{proposal.client.phone}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Share section */}
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
            Share Proposal
          </h2>
          <CopyActions
            proposalUrl={proposalUrl}
            clientName={proposal.client?.name || ''}
            tourName={proposal.tour?.name || ''}
          />
        </Card>

        {/* Payment info */}
        {proposal.deposit_paid_at && (
          <Card variant="elevated" padding="lg" className="lg:col-span-2 bg-emerald-50 border-emerald-200">
            <h2 className="font-display text-xl font-semibold text-emerald-900 mb-2">
              💰 Deposit Paid
            </h2>
            <p className="text-emerald-700">
              {formatPrice(proposal.deposit_cents / 100, currency)} received on{' '}
              {format(new Date(proposal.deposit_paid_at), 'MMMM d, yyyy h:mm a')}
            </p>
            <p className="text-sm text-emerald-600 mt-2">
              Payment processed via Stripe Connect. Funds go directly to your Stripe account.
            </p>
            {proposal.stripe_payment_intent_id && (
              <p className="text-xs text-emerald-500 mt-1 font-mono">
                Payment ID: {proposal.stripe_payment_intent_id}
              </p>
            )}
          </Card>
        )}

        {proposal.remainder_paid_at && (
          <Card variant="elevated" padding="lg" className="lg:col-span-2 bg-emerald-50 border-emerald-200">
            <h2 className="font-display text-xl font-semibold text-emerald-900 mb-2">
              ✅ Remainder Paid
            </h2>
            <p className="text-emerald-700">
              {formatPrice((proposal.remainder_cents || 0) / 100, currency)} received on{' '}
              {format(new Date(proposal.remainder_paid_at), 'MMMM d, yyyy h:mm a')}
            </p>
            <p className="text-sm text-emerald-600 mt-2">
              Payment processed via Stripe Connect. Funds go directly to your Stripe account.
            </p>
            {proposal.stripe_remainder_payment_intent_id && (
              <p className="text-xs text-emerald-500 mt-1 font-mono">
                Payment ID: {proposal.stripe_remainder_payment_intent_id}
              </p>
            )}
          </Card>
        )}

        {/* Complete Actions - Client Component */}
        <div className="lg:col-span-2">
          <CompleteActions
            proposalId={proposal.id}
            depositPaid={proposal.deposit_paid_at !== null}
            remainderCents={proposal.remainder_cents}
            remainderPaidAt={proposal.remainder_paid_at}
            completedAt={proposal.completed_at}
            totalPriceCents={proposal.total_price_cents}
            depositCents={proposal.deposit_cents}
            currency={currency}
            clientName={proposal.client?.name}
            remainderAmount={proposal.remainder_cents ? proposal.remainder_cents / 100 : undefined}
          />
        </div>

        {/* Timeline */}
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
            Timeline
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-sand-300" />
              <span className="text-sand-600">
                Created {format(new Date(proposal.created_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            {proposal.status !== 'draft' && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-ocean-500" />
                <span className="text-sand-600">Sent to client</span>
              </div>
            )}
            {['viewed', 'deposit_paid', 'confirmed'].includes(proposal.status) && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary-500" />
                <span className="text-sand-600">Viewed by client</span>
              </div>
            )}
            {proposal.deposit_paid_at && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sand-600">
                  Deposit paid {format(new Date(proposal.deposit_paid_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            )}
            {proposal.completed_at && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary-600" />
                <span className="text-sand-600">
                  Tour completed {format(new Date(proposal.completed_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            )}
            {proposal.remainder_paid_at && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-600" />
                <span className="text-sand-600">
                  Remainder paid {format(new Date(proposal.remainder_paid_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

