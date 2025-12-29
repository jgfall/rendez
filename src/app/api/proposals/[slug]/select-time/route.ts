import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, { params }: PageProps) {
  try {
    const { slug } = await params;
    const { date, time } = await request.json();

    if (!date || !time) {
      return NextResponse.json({ error: 'date and time are required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Find proposal by slug
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id')
      .eq('slug', slug)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Parse date and time into ISO string
    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    // Update proposal with scheduled time
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        scheduled_at: scheduledAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposal.id);

    if (updateError) {
      console.error('Error updating proposal:', updateError);
      return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
    }

    return NextResponse.json({ success: true, scheduled_at: scheduledAt });
  } catch (error) {
    console.error('Error in select-time API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

