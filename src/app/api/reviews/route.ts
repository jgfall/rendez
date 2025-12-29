import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { proposal_id, rating, comment } = body;

    if (!proposal_id || !rating) {
      return NextResponse.json(
        { error: 'Proposal ID and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify the proposal exists and deposit was paid (tour was completed)
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        id,
        guide_id,
        deposit_paid_at,
        client:clients!inner(id)
      `)
      .eq('id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    if (!proposal.deposit_paid_at) {
      return NextResponse.json(
        { error: 'Tour must be completed (deposit paid) before leaving a review' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('proposal_id', proposal_id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already submitted for this tour' },
        { status: 400 }
      );
    }

    // Extract client ID - handle both array and object cases
    const clientId = Array.isArray(proposal.client) 
      ? (proposal.client[0] as { id: string } | undefined)?.id
      : (proposal.client as { id: string } | undefined)?.id;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client not found for this proposal' },
        { status: 404 }
      );
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        proposal_id,
        guide_id: proposal.guide_id,
        client_id: clientId,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Review creation error:', reviewError);
      return NextResponse.json(
        { error: 'Failed to create review', details: reviewError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error: any) {
    console.error('Review API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit review', details: error.message },
      { status: 500 }
    );
  }
}

