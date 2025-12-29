import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProposalRenderer } from '@/components/proposal/proposal-renderer';
import { PublicProposalClient } from './client';
import type { PublicProposal } from '@/types/database';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicProposalPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // First, check if proposal exists directly (for debugging)
  const { data: proposalExists } = await supabase
    .from('proposals')
    .select('id, slug')
    .eq('slug', slug)
    .single();

  if (!proposalExists) {
    console.error(`[DEBUG] Proposal with slug "${slug}" does not exist in database`);
    notFound();
  }

  // Fetch proposal via RPC (server-side sanitization)
  let data, error;
  try {
    const result = await supabase
    .rpc('get_public_proposal_by_slug', { slug_param: slug });
    data = result.data;
    error = result.error;
  } catch (err) {
    console.error('[DEBUG] Exception calling RPC:', err);
    error = err as any;
  }

  if (error) {
    console.error('[DEBUG] RPC Error fetching proposal:', {
      error,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      slug,
    });
    // Try to check if function exists
    const { data: funcCheck } = await supabase
      .rpc('get_public_proposal_by_slug', { slug_param: 'test' })
      .then(() => ({ data: 'function_exists' }))
      .catch(() => ({ data: 'function_missing' }));
    console.error('[DEBUG] Function check:', funcCheck);
    notFound();
  }

  if (!data) {
    console.error(`[DEBUG] RPC returned NULL for slug: "${slug}" (proposal exists but RPC failed)`);
    console.error('[DEBUG] Proposal exists check:', proposalExists);
    notFound();
  }

  const proposal = data as PublicProposal;

  // Also fetch remainder payment info and guide_id (not in RPC for security)
  const { data: proposalData, error: proposalError } = await supabase
    .from('proposals')
    .select('remainder_cents, remainder_paid_at, guide_id, scheduled_at')
    .eq('slug', slug)
    .single();

  if (proposalError) {
    console.error('Error fetching proposal data:', proposalError);
  }

  // Track view (will be called from client component)
  return (
    <PublicProposalClient 
      proposal={proposal} 
      slug={slug}
      remainderCents={proposalData?.remainder_cents || null}
      remainderPaidAt={proposalData?.remainder_paid_at || null}
      guideId={proposalData?.guide_id || null}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .rpc('get_public_proposal_by_slug', { slug_param: slug });

  if (!data) {
    return { title: 'Proposal Not Found' };
  }

  const proposal = data as PublicProposal;

  return {
    title: `${proposal.tour.name} | Rendez`,
    description: proposal.tour.description || `Tour proposal for ${proposal.client.name}`,
    openGraph: {
      title: proposal.tour.name,
      description: proposal.tour.description || `Tour proposal for ${proposal.client.name}`,
      images: proposal.tour.cover_image_url ? [proposal.tour.cover_image_url] : [],
    },
  };
}

