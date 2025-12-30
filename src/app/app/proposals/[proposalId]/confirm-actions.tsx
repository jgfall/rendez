'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Unlock, Lock } from 'lucide-react';
import { Button, Card, Modal } from '@/components/ui';

interface ConfirmActionsProps {
  proposalId: string;
  depositPaid: boolean;
  isUnlocked: boolean;
}

export function ConfirmActions({
  proposalId,
  depositPaid,
  isUnlocked,
}: ConfirmActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unlockDetails, setUnlockDetails] = useState(isUnlocked);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlockDetails: unlockDetails }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm proposal');
      }

      setShowConfirmModal(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
      setLoading(false);
    }
  };

  return (
    <>
      <Card variant="elevated" padding="lg">
        <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
          Confirmation & Unlock
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Deposit Status */}
          <div className="p-4 rounded-xl bg-sand-50 border border-sand-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sand-900 mb-1">Deposit Status</p>
                <p className="text-sm text-sand-600">
                  {depositPaid 
                    ? '✅ Deposit marked as received'
                    : '⏳ Waiting for deposit payment'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Unlock Details Toggle */}
          <div className="p-4 rounded-xl bg-sand-50 border border-sand-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sand-900 mb-1">Unlock Details</p>
                <p className="text-sm text-sand-600">
                  {isUnlocked 
                    ? 'Details are currently visible to client'
                    : 'Details are hidden until confirmed'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isUnlocked ? (
                  <Unlock className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Lock className="h-5 w-5 text-sand-400" />
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={unlockDetails}
                onChange={(e) => setUnlockDetails(e.target.checked)}
                className="rounded border-sand-300"
              />
              <span className="text-sm text-sand-700">
                Unlock details when confirming
              </span>
            </label>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={() => setShowConfirmModal(true)}
            loading={loading}
            className="w-full"
            icon={<CheckCircle2 className="h-4 w-4" />}
          >
            {depositPaid ? 'Mark as Confirmed' : 'Mark Deposit Received & Confirm'}
          </Button>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Proposal"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sand-700">
            {depositPaid 
              ? 'This will mark the proposal as confirmed.'
              : 'This will mark the deposit as received and confirm the proposal.'
            }
          </p>
          
          {unlockDetails && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm text-emerald-700">
                ✓ Details will be unlocked and visible to the client.
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
              onClick={handleConfirm}
              loading={loading}
              className="flex-1"
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

