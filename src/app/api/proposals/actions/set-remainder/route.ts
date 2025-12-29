import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { proposalId, remainderCents } = await request.json();
    
    if (!proposalId) {
      return NextResponse.json({ error: 'Missing proposalId' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!remainderCents || remainderCents <= 0) {
      return NextResponse.json({ error: 'Invalid remainder amount' }, { status: 400 });
    }

    // Verify proposal belongs to user and is completed
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id, guide_id, completed_at')
      .eq('id', proposalId)
      .eq('guide_id', user.id)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (!proposal.completed_at) {
      return NextResponse.json({ error: 'Tour must be completed before setting remainder' }, { status: 400 });
    }

    // Set remainder amount
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        remainder_cents: remainderCents,
      })
      .eq('id', proposalId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to set remainder' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting remainder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

