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

  // Fetch proposal via RPC (server-side sanitization)
  const { data, error } = await supabase
    .rpc('get_public_proposal_by_slug', { slug_param: slug });

  if (error || !data) {
    notFound();
  }

  const proposal = data as PublicProposal;

  // Also fetch remainder payment info and guide_id (not in RPC for security)
  const { data: proposalData } = await supabase
    .from('proposals')
    .select('remainder_cents, remainder_paid_at, guide_id, scheduled_at')
    .eq('slug', slug)
    .single();

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

