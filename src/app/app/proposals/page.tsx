import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, Badge } from '@/components/ui';
import { ProposalItem } from '@/components/proposals/proposal-item';

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function ProposalsPage({ searchParams }: PageProps) {
  const { filter } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user!.id)
    .single();

  const currency = profile?.currency || 'USD';

  let query = supabase
    .from('proposals')
    .select(`
      *,
      tour:tour_templates(name, city),
      client:clients(name, email)
    `)
    .eq('guide_id', user!.id);

  // Apply filters
  if (filter === 'outgoing') {
    query = query.in('status', ['draft', 'sent', 'viewed']);
  } else if (filter === 'waiting') {
    query = query.eq('status', 'viewed').is('deposit_paid_at', null);
  } else if (filter === 'paid') {
    query = query.not('deposit_paid_at', 'is', null);
  }

  const { data: proposals } = await query.order('created_at', { ascending: false });

  const getFilterLabel = () => {
    switch (filter) {
      case 'outgoing':
        return 'Outgoing Proposals';
      case 'waiting':
        return 'Waiting on Deposit';
      case 'paid':
        return 'Paid Proposals';
      default:
        return 'All Proposals';
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-3xl font-bold text-sand-900">{getFilterLabel()}</h1>
            {filter && (
              <Link href="/app/proposals">
                <Badge variant="outline" className="cursor-pointer hover:bg-sand-100">
                  Clear filter
                </Badge>
              </Link>
            )}
          </div>
          <p className="mt-1 text-sand-600">Track and manage your tour proposals</p>
        </div>
        <Link href="/app/proposals/new">
          <Button icon={<Plus className="h-4 w-4" />}>
            New Proposal
          </Button>
        </Link>
      </div>

      {/* Proposals list */}
      {proposals && proposals.length > 0 ? (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <ProposalItem
              key={proposal.id}
              proposal={proposal}
              currency={currency}
            />
          ))}
        </div>
      ) : (
        <Card variant="outlined" padding="lg" className="text-center">
          <div className="py-8">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-sand-100 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-sand-400" />
            </div>
            <h3 className="font-display text-xl font-semibold text-sand-900 mb-2">
              No proposals yet
            </h3>
            <p className="text-sand-600 mb-6 max-w-sm mx-auto">
              Create your first proposal to send to a client. You&apos;ll need a tour template first.
            </p>
            <Link href="/app/proposals/new">
              <Button icon={<Plus className="h-4 w-4" />}>
                Create your first proposal
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

