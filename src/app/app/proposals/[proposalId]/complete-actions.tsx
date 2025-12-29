'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, CreditCard, PartyPopper, ArrowRight, LayoutDashboard } from 'lucide-react';
import { Button, Card, Modal, Confetti } from '@/components/ui';
import { formatPrice } from '@/lib/utils';

interface CompleteActionsProps {
  proposalId: string;
  depositPaid: boolean;
  remainderCents: number | null;
  remainderPaidAt: string | null;
  completedAt: string | null;
  totalPriceCents: number | null;
  depositCents: number;
  currency: string;
  clientName?: string;
}

export function CompleteActions({
  proposalId,
  depositPaid,
  remainderCents,
  remainderPaidAt,
  completedAt,
  totalPriceCents,
  depositCents,
  currency,
  clientName,
}: CompleteActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMarkCompleteClick = () => {
    if (!depositPaid) {
      setError('Deposit must be paid before marking tour complete');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmComplete = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/proposals/actions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark tour complete');
      }

      // Show confetti and success state
      setShowConfetti(true);
      setShowSuccess(true);
      // Refresh to get updated data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark complete');
      setLoading(false);
    }
  };


  const calculatedRemainder = totalPriceCents 
    ? (totalPriceCents - depositCents) / 100 
    : null;

  // Use remainderCents if available, otherwise calculate it
  const displayRemainder = remainderCents 
    ? remainderCents / 100 
    : (calculatedRemainder || 0);

  // Success state with confetti - show immediately after completion
  if (showSuccess) {
    return (
      <>
        {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
        <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-200 mb-6">
              <PartyPopper className="h-10 w-10 text-emerald-700" />
            </div>
            <h2 className="font-display text-2xl font-bold text-emerald-900 mb-3">
              Tour Completed! 🎉
            </h2>
            <p className="text-sand-700 mb-6">
              The remainder payment of {formatPrice(displayRemainder, currency)} will be charged to the card on file.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/app">
                <Button variant="outline" icon={<LayoutDashboard className="h-4 w-4" />}>
                  Back to Dashboard
                </Button>
              </Link>
              <Link href="/app/revenue">
                <Button icon={<ArrowRight className="h-4 w-4" />}>
                  View Revenue
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card variant="elevated" padding="lg">
        <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
          Tour Completion & Payment
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Mark Complete */}
          {!completedAt && (
            <div className="p-4 rounded-xl bg-sand-50 border border-sand-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sand-900 mb-1">Mark Tour Complete</p>
                  <p className="text-sm text-sand-600">
                    Mark this tour as completed after the tour has finished.
                  </p>
                </div>
                <Button
                  onClick={handleMarkCompleteClick}
                  loading={loading}
                  disabled={!depositPaid}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Mark Complete
                </Button>
              </div>
            </div>
          )}

          {completedAt && !showSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Tour marked complete on {new Date(completedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* Remainder Payment Status */}
          {remainderCents && remainderCents > 0 && !showSuccess && (
            <div className="p-4 rounded-xl bg-warning-50 border border-warning-200">
              <p className="font-medium text-sand-900 mb-2">
                Remainder Payment: {formatPrice(remainderCents / 100, currency)}
              </p>
              {remainderPaidAt ? (
                <p className="text-sm text-emerald-700">
                  ✅ Paid on {new Date(remainderPaidAt).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-sm text-warning-700">
                  ⏳ Waiting for client to pay remainder
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Mark Tour as Complete"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-ocean-50 border border-ocean-200">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-ocean-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sand-900 mb-1">Billing Information</p>
                <p className="text-sm text-sand-700">
                  When you mark this tour as complete, the remainder payment of{' '}
                  <strong>{formatPrice(displayRemainder, currency)}</strong> will be automatically charged to the card on file for this customer.
                </p>
              </div>
            </div>
          </div>

          {clientName && (
            <div className="p-3 rounded-lg bg-sand-50 border border-sand-200">
              <p className="text-sm text-sand-600">
                <span className="font-medium">Client:</span> {clientName}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmComplete}
              loading={loading}
              className="flex-1"
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              Mark Complete & Charge Card
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
