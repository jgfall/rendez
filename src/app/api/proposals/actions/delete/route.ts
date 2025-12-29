import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    const { proposalId } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!proposalId) {
      return NextResponse.json({ error: 'Missing proposalId' }, { status: 400 });
    }

    // Verify proposal belongs to user
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id, guide_id')
      .eq('id', proposalId)
      .eq('guide_id', user.id)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Delete proposal (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('proposals')
      .delete()
      .eq('id', proposalId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

