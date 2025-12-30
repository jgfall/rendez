import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;
    const { unlockDetails } = await request.json();
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify proposal belongs to user
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id, guide_id, deposit_paid_at, manual_unlock')
      .eq('id', proposalId)
      .eq('guide_id', user.id)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Update proposal: mark deposit as received and unlock if requested
    const updateData: any = {
      deposit_paid_at: proposal.deposit_paid_at || new Date().toISOString(),
      status: 'confirmed',
    };

    if (unlockDetails) {
      updateData.manual_unlock = true;
    }

    const { error: updateError } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to confirm proposal' }, { status: 500 });
    }

    // Send confirmation email to client
    const { sendConfirmationEmail } = await import('@/lib/email');
    
    // Get client and tour info
    const { data: proposalData } = await supabase
      .from('proposals')
      .select(`
        slug,
        client:clients!inner(name, email),
        tour:tour_templates!inner(name),
        guide_id
      `)
      .eq('id', proposalId)
      .single();

    if (proposalData && (proposalData.client as any)?.email && (proposalData.client as any)?.name) {
      const client = proposalData.client as any;
      const tour = proposalData.tour as any;
      
      // Get guide name
      const { data: guideProfile } = await supabase
        .from('profiles')
        .select('full_name, business_name')
        .eq('id', proposalData.guide_id)
        .single();

      const guideName = guideProfile?.business_name || guideProfile?.full_name || 'Your guide';
      const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/${proposalData.slug}`;

      await sendConfirmationEmail(
        client.email,
        client.name,
        guideName,
        tour.name,
        proposalUrl
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error confirming proposal:', error);
    return NextResponse.json(
      { error: 'Failed to confirm proposal' },
      { status: 500 }
    );
  }
}

