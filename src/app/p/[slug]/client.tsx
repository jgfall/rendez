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
  paymentLinkUrl?: string | null;
}

export function PublicProposalClient({ 
  proposal, 
  slug, 
  remainderCents,
  remainderPaidAt,
  guideId,
  paymentLinkUrl,
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

  const handleRequestToBook = async () => {
    setLoading(true);
    try {
      // Request to book - sends a message/notification to the guide
      const response = await fetch(`/api/proposals/${slug}/request-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      alert('Booking request sent! Your guide will confirm and share payment details.');
    } catch (err) {
      console.error('Failed to send booking request:', err);
      alert('Failed to send booking request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayDeposit = () => {
    // This will open the guide's payment link in a new tab
    if (paymentLinkUrl) {
      window.open(paymentLinkUrl, '_blank');
    } else {
      alert('Payment link not available. Please contact your guide.');
    }
  };

  const handlePayRemainder = () => {
    // This will open the guide's payment link in a new tab
    if (paymentLinkUrl) {
      window.open(paymentLinkUrl, '_blank');
    } else {
      alert('Payment link not available. Please contact your guide.');
    }
  };

  return (
    <ProposalRenderer
      proposal={proposal}
      onRequestToBook={handleRequestToBook}
      onPayDeposit={handlePayDeposit}
      onPayRemainder={handlePayRemainder}
      remainderCents={remainderCents}
      remainderPaidAt={remainderPaidAt}
      guideId={guideId}
      paymentLinkUrl={paymentLinkUrl}
    />
  );
}
