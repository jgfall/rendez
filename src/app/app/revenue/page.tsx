import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { RevenueChart } from '@/components/revenue/revenue-chart';
import { RevenueSummary } from '@/components/revenue/revenue-summary';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  ArrowLeft 
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function RevenuePage() {
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

  // Fetch all proposals with payments
  const { data: proposals } = await supabase
    .from('proposals')
    .select(`
      *,
      tour:tour_templates(name),
      client:clients(name)
    `)
    .eq('guide_id', user.id)
    .order('created_at', { ascending: false });

  // Calculate revenue metrics
  const allDeposits = proposals?.filter(p => p.deposit_paid_at) || [];
  const allRemainders = proposals?.filter(p => p.remainder_paid_at) || [];

  // Total received
  const totalDeposits = allDeposits.reduce((sum, p) => sum + (p.deposit_cents || 0), 0);
  const totalRemainders = allRemainders.reduce((sum, p) => sum + (p.remainder_cents || 0), 0);
  const totalReceived = totalDeposits + totalRemainders;

  // Available funds: All deposits (paid) + Remainders from completed tours only, minus cashed out amounts
  // Deposits can be cashed out as soon as they're paid, even if tour isn't completed
  const allPaidDeposits = allDeposits.reduce((sum, p) => sum + (p.deposit_cents || 0), 0);
  
  // Remainders from completed tours (since they're paid after completion)
  // Include tours that are marked complete with remainder_cents set
  // Note: remainder_paid_at may not be set yet if automatic charging isn't implemented,
  // but the remainder amount should still be available once the tour is marked complete
  const completedTours = proposals?.filter(p => p.completed_at) || [];
  const completedRemainders = completedTours
    .filter(p => p.remainder_cents && p.remainder_cents > 0) // Include if remainder_cents is set
    .reduce((sum, p) => sum + (p.remainder_cents || 0), 0);
  const grossAvailable = allPaidDeposits + completedRemainders;
  
  // Get total cashed out amount (includes pending, processing, and completed payouts)
  const { data: cashedOutResult, error: cashedOutError } = await supabase
    .rpc('get_total_cashed_out', { guide_id_param: user.id });
  const cashedOutAmount = cashedOutResult || 0;
  
  // Calculate net available (minus what's already been cashed out)
  const availableForCashOut = Math.max(0, grossAvailable - cashedOutAmount);
  
  // Debug: Log calculation details (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    console.log('Revenue calculation debug:', {
      allPaidDeposits,
      completedRemainders,
      grossAvailable,
      cashedOutAmount,
      availableForCashOut,
      proposalsCount: proposals?.length || 0,
      depositsCount: allDeposits.length,
    });
  }

  // Pending Revenue: Expected remainders ONLY (NOT deposits) for tours with deposit paid but NOT yet completed
  // Deposits are immediately available in "Available for Cash Out" above
  // This only shows the remainder amount (total - deposit) that will be charged when the tour is marked complete
  const pendingTours = proposals?.filter(p => 
    p.deposit_paid_at && !p.completed_at
  ) || [];
  
  // Calculate expected remainders (total - deposit) for tours that haven't been completed yet
  // NOTE: This does NOT include deposits - deposits are already in availableForCashOut above
  const pendingRemainders = pendingTours.reduce((sum, p) => {
    // If remainder_cents is already set, use it; otherwise calculate from total - deposit
    if (p.remainder_cents) {
      return sum + p.remainder_cents;
    } else if (p.total_price_cents && p.deposit_cents) {
      return sum + (p.total_price_cents - p.deposit_cents);
    }
    return sum;
  }, 0);
  
  const pendingAmount = pendingRemainders;

  // Group by month for chart
  const monthlyData: Record<string, { deposits: number; remainders: number }> = {};
  
  allDeposits.forEach(p => {
    if (!p.deposit_paid_at) return;
    const month = new Date(p.deposit_paid_at).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { deposits: 0, remainders: 0 };
    }
    monthlyData[month].deposits += p.deposit_cents || 0;
  });

  allRemainders.forEach(p => {
    if (!p.remainder_paid_at) return;
    const month = new Date(p.remainder_paid_at).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { deposits: 0, remainders: 0 };
    }
    monthlyData[month].remainders += p.remainder_cents || 0;
  });

  // Get last 12 months
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(date.toISOString().slice(0, 7));
  }

  const chartData = months.map(month => ({
    month,
    deposits: (monthlyData[month]?.deposits || 0) / 100,
    remainders: (monthlyData[month]?.remainders || 0) / 100,
    total: ((monthlyData[month]?.deposits || 0) + (monthlyData[month]?.remainders || 0)) / 100,
  }));

  // Recent transactions
  const recentTransactions = [
    ...allDeposits.map(p => ({
      id: p.id,
      type: 'deposit' as const,
      amount: p.deposit_cents || 0,
      date: p.deposit_paid_at!,
      client: p.client?.name || 'Unknown',
      tour: p.tour?.name || 'Unknown',
    })),
    ...allRemainders.map(p => ({
      id: p.id,
      type: 'remainder' as const,
      amount: p.remainder_cents || 0,
      date: p.remainder_paid_at!,
      client: p.client?.name || 'Unknown',
      tour: p.tour?.name || 'Unknown',
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app">
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-sand-900">Revenue</h1>
          <p className="mt-1 text-sand-600">Track your cash flow and earnings</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="elevated" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-sand-500 mb-1">Total Received</p>
              <p className="font-display text-2xl font-bold text-sand-900">
                {formatPrice(totalReceived / 100, currency)}
              </p>
              <p className="text-xs text-sand-500 mt-1">All time</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-sand-500 mb-1">Available Now</p>
              <p className="font-display text-2xl font-bold text-sand-900">
                {formatPrice(availableForCashOut / 100, currency)}
              </p>
              <p className="text-xs text-sand-500 mt-1">Ready to cash out</p>
              {cashedOutAmount > 0 && (
                <p className="text-xs text-sand-400 mt-1">
                  ({formatPrice(grossAvailable / 100, currency)} total - {formatPrice(cashedOutAmount / 100, currency)} cashed out)
                </p>
              )}
            </div>
            <div className="h-12 w-12 rounded-xl bg-ocean-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-ocean-600" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-sand-500 mb-1">Pending</p>
              <p className="font-display text-2xl font-bold text-sand-900">
                {formatPrice(pendingAmount / 100, currency)}
              </p>
              <p className="text-xs text-sand-500 mt-1">Expected remainders</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-warning-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-sand-500 mb-1">This Month</p>
              <p className="font-display text-2xl font-bold text-sand-900">
                {formatPrice(
                  ((monthlyData[months[months.length - 1]]?.deposits || 0) +
                  (monthlyData[months[months.length - 1]]?.remainders || 0)) / 100,
                  currency
                )}
              </p>
              <p className="text-xs text-sand-500 mt-1">Current month</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-6">
            Revenue Over Time
          </h2>
          <RevenueChart data={chartData} currency={currency} />
        </Card>

        {/* Recent Transactions */}
        <Card variant="elevated" padding="lg">
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
            Recent Transactions
          </h2>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={`${transaction.id}-${transaction.type}`}
                  className="p-3 rounded-xl border border-sand-200 bg-sand-50"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sand-900 truncate">
                        {transaction.client}
                      </p>
                      <p className="text-xs text-sand-600 truncate">
                        {transaction.tour}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-medium text-sand-900">
                        {formatPrice(transaction.amount / 100, currency)}
                      </p>
                      <p className="text-xs text-sand-500">
                        {transaction.type === 'deposit' ? 'Deposit' : 'Remainder'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-sand-500 mt-1">
                    {new Date(transaction.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sand-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-sand-300" />
              <p className="text-sm">No transactions yet</p>
            </div>
          )}
        </Card>
      </div>

      {/* Revenue Summary */}
      <RevenueSummary
        totalReceived={totalReceived}
        availableForCashOut={availableForCashOut}
        pendingAmount={pendingAmount}
        currency={currency}
      />
    </div>
  );
}

