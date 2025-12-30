import { createClient } from '@/lib/supabase/server';
import { Card, Button } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { RevenueChart } from '@/components/revenue/revenue-chart';
import { 
  DollarSign, 
  TrendingUp, 
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

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

  // Total received (all-time)
  const totalDeposits = allDeposits.reduce((sum, p) => sum + (p.deposit_cents || 0), 0);
  const totalRemainders = allRemainders.reduce((sum, p) => sum + (p.remainder_cents || 0), 0);
  const totalReceived = totalDeposits + totalRemainders;

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

    </div>
  );
}

