'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Calendar, Users, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Card, ProposalStatusBadge, Modal, Button } from '@/components/ui';
import { formatPrice } from '@/lib/utils';

interface ProposalItemProps {
  proposal: {
    id: string;
    slug: string;
    status: string;
    scheduled_at: string | null;
    group_size: number | null;
    deposit_cents: number;
    client?: { name: string; email?: string | null } | null;
    tour?: { name: string; city?: string | null } | null;
  };
  currency: string;
}

export function ProposalItem({ proposal, currency }: ProposalItemProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/proposals/actions/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete proposal');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete proposal');
      setDeleting(false);
    }
  };

  return (
    <>
      <Card variant="elevated" padding="none" hover>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
          {/* Main info - clickable */}
          <Link href={`/app/proposals/${proposal.id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-display text-xl font-semibold text-sand-900 truncate">
                {proposal.client?.name}
              </h3>
              <ProposalStatusBadge status={proposal.status as any} />
            </div>
            <p className="text-sm text-sand-600 truncate">
              {proposal.tour?.name}
              {proposal.tour?.city && ` • ${proposal.tour.city}`}
            </p>
          </Link>

          {/* Meta info */}
          <div className="flex items-center gap-6 text-sm text-sand-500">
            {proposal.scheduled_at && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(proposal.scheduled_at), 'MMM d, yyyy')}</span>
              </div>
            )}
            {proposal.group_size && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{proposal.group_size}</span>
              </div>
            )}
            <div className="font-medium text-sand-700">
              {formatPrice(proposal.deposit_cents / 100, currency)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <a
              href={`/p/${proposal.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-sand-400 hover:text-primary-600 transition-colors shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-5 w-5" />
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowDeleteModal(true);
              }}
              className="p-2 text-sand-400 hover:text-red-500 transition-colors shrink-0"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setError(null);
        }}
        title="Delete Proposal"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-warning-50 border border-warning-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sand-900 mb-1">Are you sure?</p>
                <p className="text-sm text-sand-700">
                  This will permanently delete the proposal for <strong>{proposal.client?.name}</strong>. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setError(null);
              }}
              className="flex-1"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              className="flex-1"
            >
              Delete Proposal
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

