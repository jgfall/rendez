import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Mark a tour as complete
 * Since we're not processing payments automatically, this just marks the tour as complete
 * Guides handle remainder payments externally via their payment links
 */
export async function POST(request: NextRequest) {
  try {
    const { proposalId } = await request.json();
    
    if (!proposalId) {
      return NextResponse.json({ error: 'Missing proposalId' }, { status: 400 });
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify proposal belongs to user and get full proposal data
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select(`
        id,
        slug,
        guide_id,
        deposit_paid_at,
        remainder_cents,
        remainder_paid_at,
        total_price_cents,
        deposit_cents
      `)
      .eq('id', proposalId)
      .eq('guide_id', user.id)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (!proposal.deposit_paid_at) {
      return NextResponse.json({ error: 'Deposit must be paid before marking complete' }, { status: 400 });
    }

    // Calculate remainder amount automatically (if not already set)
    let remainderCents = proposal.remainder_cents;
    if (!remainderCents && proposal.total_price_cents && proposal.deposit_cents) {
      remainderCents = proposal.total_price_cents - proposal.deposit_cents;
    }

    // Mark as complete and set remainder amount if needed
    const updateData: any = {
      completed_at: new Date().toISOString(),
      status: 'confirmed',
    };
    
    // Only update remainder_cents if it's not already set and we calculated one
    if (remainderCents && !proposal.remainder_cents) {
      updateData.remainder_cents = remainderCents;
    }

    const { error: updateError } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to mark complete' }, { status: 500 });
    }

    // Return success
    // Note: Remainder payments are handled externally by guides via their payment links
    return NextResponse.json({ 
      success: true,
      remainderCents: remainderCents || 0,
      remainderPaid: proposal.remainder_paid_at !== null,
      message: remainderCents && remainderCents > 0 && !proposal.remainder_paid_at
        ? 'Tour marked complete. Client can pay remainder via your payment link.'
        : 'Tour marked complete.'
    });
  } catch (error) {
    console.error('Error marking tour complete:', error);
    return NextResponse.json(
      { error: 'Failed to mark tour complete' },
      { status: 500 }
    );
  }
}
