import Link from 'next/link';
import { Plus, Map } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card } from '@/components/ui';
import { TourItem } from '@/components/tours/tour-item';

export default async function ToursPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tours } = await supabase
    .from('tour_templates')
    .select('*, tour_blocks(count)')
    .eq('guide_id', user!.id)
    .order('created_at', { ascending: false });

  // Get user currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user!.id)
    .single();

  const currency = profile?.currency || 'USD';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-5xl font-bold text-sand-900">Tour Templates</h1>
          <p className="mt-1 text-sand-600">Create reusable templates for your tours</p>
        </div>
        <Link href="/app/tours/new">
          <Button icon={<Plus className="h-4 w-4" />}>
            New Tour Template
          </Button>
        </Link>
      </div>

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

