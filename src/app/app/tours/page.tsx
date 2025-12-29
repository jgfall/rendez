import Link from 'next/link';
import { Plus, Map, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card } from '@/components/ui';
import { TourItem } from '@/components/tours/tour-item';
import { canCreateTourTemplate } from '@/lib/subscriptions';

export default async function ToursPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tours } = await supabase
    .from('tour_templates')
    .select('*, tour_blocks(count)')
    .eq('guide_id', user!.id)
    .order('created_at', { ascending: false });

  // Get user currency and subscription
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency, subscription_plan')
    .eq('id', user!.id)
    .single();

  const currency = profile?.currency || 'USD';
  const subscriptionPlan = (profile?.subscription_plan || 'free') as 'free' | 'pro';
  const tourCount = tours?.length || 0;
  const canCreate = canCreateTourTemplate(subscriptionPlan, tourCount);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-5xl font-bold text-sand-900">Tour Templates</h1>
          <p className="mt-1 text-sand-600">Create reusable templates for your tours</p>
        </div>
        {canCreate ? (
        <Link href="/app/tours/new">
          <Button icon={<Plus className="h-4 w-4" />}>
            New Tour Template
          </Button>
        </Link>
        ) : (
          <Link href="/app/settings/subscription">
            <Button icon={<Sparkles className="h-4 w-4" />} variant="primary">
              Upgrade to Create More
            </Button>
          </Link>
        )}
      </div>

      {/* Upgrade prompt for free users at limit */}
      {!canCreate && tourCount > 0 && (
        <Card variant="outlined" padding="lg" className="mb-6 bg-emerald-50 border-emerald-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-900 mb-1">
                You've reached your free plan limit
              </h3>
              <p className="text-sm text-emerald-700 mb-3">
                Free plans include 1 tour template. Upgrade to Pro for unlimited templates and more features.
              </p>
              <Link href="/app/settings/subscription">
                <Button size="sm" variant="primary">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Tours grid */}
      {tours && tours.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourItem
              key={tour.id}
              tour={tour}
              currency={currency}
            />
          ))}
        </div>
      ) : (
        <Card variant="outlined" padding="lg" className="text-center">
          <div className="py-8">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-sand-100 flex items-center justify-center mb-4">
              <Map className="h-8 w-8 text-sand-400" />
            </div>
            <h3 className="font-display text-3xl font-semibold text-sand-900 mb-2">
              No tour templates yet
            </h3>
            <p className="text-sand-600 mb-6 max-w-sm mx-auto">
              Create your first tour template to start building proposals for your clients.
            </p>
            <Link href="/app/tours/new">
              <Button icon={<Plus className="h-4 w-4" />}>
                Create your first template
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

