import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TourEditor } from '@/components/tours/tour-editor';

interface PageProps {
  params: Promise<{ tourId: string }>;
}

export default async function EditTourPage({ params }: PageProps) {
  const { tourId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tour } = await supabase
    .from('tour_templates')
    .select('*')
    .eq('id', tourId)
    .eq('guide_id', user!.id)
    .single();

  if (!tour) {
    notFound();
  }

  const { data: blocks } = await supabase
    .from('tour_blocks')
    .select('*')
    .eq('tour_id', tourId)
    .order('sort_order', { ascending: true });

  return <TourEditor tour={tour} blocks={blocks || []} />;
}

