import Link from 'next/link';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Plus,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, Badge, ProposalStatusBadge } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user.id)
    .single();

  const currency = profile?.currency || 'USD';

  // Fetch all proposals
  const { data: proposals } = await supabase
    .from('proposals')
    .select(`
      *,
      tour:tour_templates(name, city),
      client:clients(name, email)
    `)
    .eq('guide_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch upcoming scheduled tours (next 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const upcomingProposals = proposals?.filter(p => {
    if (!p.scheduled_at) return false;
    const scheduled = new Date(p.scheduled_at);
    return scheduled >= now && scheduled <= thirtyDaysFromNow;
  }) || [];

  // Categorize proposals
  const outgoingProposals = proposals?.filter(p => 
    ['draft', 'sent', 'viewed'].includes(p.status)
  ) || [];

  const waitingOnDeposit = proposals?.filter(p => 
    p.status === 'viewed' && !p.deposit_paid_at
  ) || [];

  const paidProposals = proposals?.filter(p => 
    p.deposit_paid_at !== null
  ) || [];

  const confirmedProposals = proposals?.filter(p => 
    p.status === 'confirmed'
  ) || [];

  // Calculate totals
  const totalOutgoing = outgoingProposals.length;
  const totalWaiting = waitingOnDeposit.length;
  const totalPaid = paidProposals.length;
  const totalUpcoming = upcomingProposals.length;

  // Calculate revenue
  const totalRevenue = paidProposals.reduce((sum, p) => sum + (p.deposit_cents || 0), 0);

  // Get proposals for calendar (scheduled in next 30 days)
  const calendarProposals = upcomingProposals
    .filter(p => p.scheduled_at)
    .sort((a, b) => {
      const dateA = new Date(a.scheduled_at!).getTime();
      const dateB = new Date(b.scheduled_at!).getTime();
      return dateA - dateB;
    });


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-sand-900">Dashboard</h1>
          <p className="mt-1 text-sand-600">Your tour operations command center</p>
        </div>
        <Link href="/app/proposals/new">
          <Button icon={<Plus className="h-4 w-4" />}>
            New Proposal
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/app/proposals?filter=outgoing">
          <Card variant="elevated" padding="md" hover className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-sand-500 mb-1">Outgoing</p>
                <p className="font-display text-2xl font-bold text-sand-900">{totalOutgoing}</p>
                <p className="text-xs text-sand-500 mt-1">Proposals sent</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/app/proposals?filter=waiting">
          <Card variant="elevated" padding="md" hover className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-sand-500 mb-1">Waiting on Deposit</p>
                <p className="font-display text-2xl font-bold text-sand-900">{totalWaiting}</p>
                <p className="text-xs text-sand-500 mt-1">Needs payment</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-warning-600" />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/app/proposals?filter=paid">
          <Card variant="elevated" padding="md" hover className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-sand-500 mb-1">Paid</p>
                <p className="font-display text-2xl font-bold text-sand-900">{totalPaid}</p>
                <p className="text-xs text-sand-500 mt-1">Deposits received</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/app/revenue">
          <Card variant="elevated" padding="md" hover className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-sand-500 mb-1">Revenue</p>
                <p className="font-display text-2xl font-bold text-sand-900">
                  {formatPrice(totalRevenue / 100, currency)}
                </p>
                <p className="text-xs text-sand-500 mt-1">Total deposits</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-ocean-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-ocean-600" />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar View */}
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <DashboardCalendar 
            proposals={calendarProposals}
            totalUpcoming={totalUpcoming}
          />
        </Card>

        {/* Upcoming Tours */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-sand-900">
              Coming Up
            </h2>
            <Link href="/app/proposals">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                View All
              </Button>
            </Link>
          </div>

          {upcomingProposals.length > 0 ? (
            <div className="space-y-3">
              {upcomingProposals.slice(0, 5).map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/app/proposals/${proposal.id}`}
                  className="block p-3 rounded-xl border border-sand-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sand-900 truncate">
                        {proposal.client?.name}
                      </p>
                      <p className="text-sm text-sand-600 truncate">
                        {proposal.tour?.name}
                      </p>
                    </div>
                    <ProposalStatusBadge status={proposal.status} />
                  </div>
                  {proposal.scheduled_at && (
                    <div className="flex items-center gap-1.5 text-xs text-sand-500 mt-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(proposal.scheduled_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sand-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-sand-300" />
              <p className="text-sm">No upcoming tours</p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Waiting on Deposit */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-sand-900">
              Waiting on Deposit
            </h2>
            {waitingOnDeposit.length > 0 && (
              <Badge variant="warning" size="sm">
                {waitingOnDeposit.length} pending
              </Badge>
            )}
          </div>

          {waitingOnDeposit.length > 0 ? (
            <div className="space-y-3">
              {waitingOnDeposit.slice(0, 5).map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/app/proposals/${proposal.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-warning-200 bg-warning-50/50 hover:bg-warning-100/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sand-900 truncate">
                      {proposal.client?.name}
                    </p>
                    <p className="text-sm text-sand-600 truncate">
                      {proposal.tour?.name}
                    </p>
                    <p className="text-xs text-sand-500 mt-1">
                      {formatPrice(proposal.deposit_cents / 100, currency)} deposit
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-sand-400 shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sand-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-sand-300" />
              <p className="text-sm">All caught up!</p>
            </div>
          )}
        </Card>

        {/* Recent Proposals */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-sand-900">
              Recent Activity
            </h2>
            <Link href="/app/proposals">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                View All
              </Button>
            </Link>
          </div>

          {proposals && proposals.length > 0 ? (
            <div className="space-y-3">
              {proposals.slice(0, 5).map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/app/proposals/${proposal.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-sand-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sand-900 truncate">
                        {proposal.client?.name}
                      </p>
                      <ProposalStatusBadge status={proposal.status} />
                    </div>
                    <p className="text-sm text-sand-600 truncate">
                      {proposal.tour?.name}
                      {proposal.tour?.city && ` • ${proposal.tour.city}`}
                    </p>
                    <p className="text-xs text-sand-500 mt-1">
                      {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-sand-400 shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sand-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-sand-300" />
              <p className="text-sm mb-4">No proposals yet</p>
              <Link href="/app/proposals/new">
                <Button size="sm" icon={<Plus className="h-4 w-4" />}>
                  Create First Proposal
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

