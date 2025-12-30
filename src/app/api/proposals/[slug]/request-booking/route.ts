import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // Fetch proposal to get guide_id
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, guide_id, client:clients!inner(name, email), tour:tour_templates!inner(name)')
      .eq('slug', slug)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Send email notification to guide
    const { sendBookingRequestEmail } = await import('@/lib/email');
    
    // Get guide's email from auth.users (requires service role)
    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    
    const { data: guideUser } = await supabaseAdmin.auth.admin.getUserById(proposal.guide_id);
    const guideEmail = guideUser?.user?.email;

    if (guideEmail) {
      const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/proposals/${proposal.id}`;
      const client = proposal.client as any;
      const tour = proposal.tour as any;
      
      await sendBookingRequestEmail(
        guideEmail,
        client.name,
        tour.name,
        proposalUrl
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Booking request sent to guide'
    });
  } catch (error) {
    console.error('Error sending booking request:', error);
    return NextResponse.json(
      { error: 'Failed to send booking request' },
      { status: 500 }
    );
  }
}

