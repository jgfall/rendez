import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ guideId: string }>;
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { guideId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get availability using RPC function
    const { data, error } = await supabase.rpc('get_guide_availability', {
      guide_id_param: guideId,
      start_date: startDate,
      end_date: endDate,
    });

    if (error) {
      console.error('Error fetching availability:', error);
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    return NextResponse.json({ availability: data || [] });
  } catch (error) {
    console.error('Error in availability API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

