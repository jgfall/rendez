'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProposalRenderer } from '@/components/proposal/proposal-renderer';
import type { PublicProposal } from '@/types/database';

interface PublicProposalClientProps {
  proposal: PublicProposal;
  slug: string;
  remainderCents?: number | null;
  remainderPaidAt?: string | null;
  guideId?: string | null;
}

export function PublicProposalClient({ 
  proposal, 
  slug, 
  remainderCents,
  remainderPaidAt,
  guideId,
}: PublicProposalClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Track view on first load
  useEffect(() => {
    const trackView = async () => {
      try {
        await fetch(`/api/proposals/${slug}/view`, { method: 'POST' });
      } catch (err) {
        // Silently fail
        console.error('Failed to track view:', err);
      }
    };

    trackView();
  }, [slug]);

  const handlePayDeposit = async () => {
    setLoading(true);
    try {
      // Only use test mode if explicitly requested via query param
      // This allows testing real Stripe Checkout even in development
      const isTest = new URLSearchParams(window.location.search).get('test') === 'true';

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, isTest }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayRemainder = async () => {
    setLoading(true);
    try {
      // Only use test mode if explicitly requested via query param
      const isTest = new URLSearchParams(window.location.search).get('test') === 'true';

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, isTest, isRemainder: true }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to create remainder checkout session:', err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProposalRenderer
      proposal={proposal}
      onPayDeposit={handlePayDeposit}
      onPayRemainder={handlePayRemainder}
      remainderCents={remainderCents}
      remainderPaidAt={remainderPaidAt}
      guideId={guideId}
    />
  );
}
