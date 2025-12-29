'use client';

import { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { Button, Textarea, Card } from '@/components/ui';

interface FeedbackFormProps {
  proposalId: string;
  proposalSlug: string;
  tourName: string;
  guideName: string;
  onSubmitted?: () => void;
}

export function FeedbackForm({ proposalId, proposalSlug, tourName, guideName, onSubmitted }: FeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: proposalId,
          rating,
          comment: comment.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      setSubmitted(true);
      onSubmitted?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card variant="elevated" padding="lg" className="mt-6">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
            <Star className="h-8 w-8 text-emerald-600 fill-emerald-600" />
          </div>
          <h3 className="font-display text-xl font-semibold text-sand-900 mb-2">
            Thank You for Your Feedback!
          </h3>
          <p className="text-sm text-sand-600">
            Your review helps {guideName} improve and helps other travelers make informed decisions.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className="mt-6">
      <h3 className="font-display text-xl font-semibold text-sand-900 mb-2">
        How was your tour?
      </h3>
      <p className="text-sm text-sand-600 mb-6">
        Share your experience with {guideName} and help other travelers discover great tours.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-sand-700 mb-3">
            Rating *
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                className="focus:outline-none transition-transform hover:scale-110"
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    (hoveredRating !== null ? hoveredRating >= star : rating !== null && rating >= star)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-sand-300'
                  }`}
                />
              </button>
            ))}
            {rating && (
              <span className="ml-2 text-sm text-sand-600">
                {rating === 5 && 'Excellent'}
                {rating === 4 && 'Great'}
                {rating === 3 && 'Good'}
                {rating === 2 && 'Fair'}
                {rating === 1 && 'Poor'}
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <Textarea
          label="Your Review (optional)"
          placeholder="Tell others about your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          hint="Share what you loved about the tour, what made it special, or any suggestions for improvement."
        />

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          loading={submitting}
          disabled={!rating || submitting}
          icon={<Send className="h-4 w-4" />}
          className="w-full"
        >
          Submit Review
        </Button>
      </form>
    </Card>
  );
}

