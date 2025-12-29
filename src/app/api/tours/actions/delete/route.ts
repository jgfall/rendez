import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    const { tourId } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!tourId) {
      return NextResponse.json({ error: 'Missing tourId' }, { status: 400 });
    }

    // Verify tour belongs to user
    const { data: tour, error: fetchError } = await supabase
      .from('tour_templates')
      .select('id, guide_id')
      .eq('id', tourId)
      .eq('guide_id', user.id)
      .single();

    if (fetchError || !tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    // Check if tour is used in any proposals
    const { data: proposals } = await supabase
      .from('proposals')
      .select('id')
      .eq('tour_id', tourId)
      .limit(1);

    if (proposals && proposals.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete tour template that is used in proposals',
        hasProposals: true 
      }, { status: 400 });
    }

    // Delete tour (cascade will handle tour_blocks)
    const { error: deleteError } = await supabase
      .from('tour_templates')
      .delete()
      .eq('id', tourId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete tour' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tour:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

