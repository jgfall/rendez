'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Map, Clock, DollarSign, Trash2, AlertTriangle } from 'lucide-react';
import { Card, Badge, Modal, Button } from '@/components/ui';
import { formatPrice } from '@/lib/utils';

interface TourItemProps {
  tour: {
    id: string;
    name: string;
    city: string | null;
    duration_minutes: number;
    base_price_cents: number;
    price_mode: string;
    description: string | null;
    cover_image_url: string | null;
  };
  currency: string;
}

export function TourItem({ tour, currency }: TourItemProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/tours/actions/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId: tour.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete tour');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tour');
      setDeleting(false);
    }
  };

  return (
    <>
      <Card variant="elevated" padding="none" hover className="overflow-hidden h-full relative group">
        {/* Delete button - appears on hover */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDeleteModal(true);
          }}
          className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-lg text-sand-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <Link href={`/app/tours/${tour.id}/edit`}>
          {/* Cover image */}
          <div className="relative h-40 bg-gradient-to-br from-sand-100 to-sand-200">
            {tour.cover_image_url ? (
              <img
                src={tour.cover_image_url}
                alt={tour.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Map className="h-12 w-12 text-sand-300" />
              </div>
            )}
            {tour.city && (
              <div className="absolute top-3 left-3">
                <Badge variant="default" size="sm">
                  {tour.city}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-display text-xl font-semibold text-sand-900 mb-2 line-clamp-1">
              {tour.name}
            </h3>
            
            <div className="flex items-center gap-4 text-sm text-sand-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(tour.duration_minutes)}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span>{formatPrice(tour.base_price_cents / 100, currency)}</span>
                {tour.price_mode === 'per_person' && <span>/person</span>}
              </div>
            </div>

            {tour.description && (
              <p className="mt-2 text-sm text-sand-500 line-clamp-2">
                {tour.description}
              </p>
            )}
          </div>
        </Link>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setError(null);
        }}
        title="Delete Tour Template"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-warning-50 border border-warning-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sand-900 mb-1">Are you sure?</p>
                <p className="text-sm text-sand-700">
                  This will permanently delete the tour template <strong>{tour.name}</strong> and all its blocks. 
                  This action cannot be undone.
                </p>
                <p className="text-sm text-warning-700 mt-2 font-medium">
                  Note: You cannot delete a tour template that is used in existing proposals.
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
              Delete Tour Template
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

