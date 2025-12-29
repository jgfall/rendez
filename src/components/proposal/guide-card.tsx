'use client';

import { Star } from 'lucide-react';
import { Card } from '@/components/ui';
import type { PublicProposal } from '@/types/database';

interface GuideCardProps {
  guide: PublicProposal['guide'];
}

export function GuideCard({ guide }: GuideCardProps) {
  const displayName = guide.business_name || guide.full_name || 'Your Guide';
  const hasRating = guide.average_rating !== null && guide.review_count !== null && guide.review_count > 0;
  const rating = hasRating ? guide.average_rating! : 5;
  const reviewCount = guide.review_count || 0;

  return (
    <Card variant="default" padding="md">
      <p className="eyebrow mb-3">Your Guide</p>
      <div className="flex items-start gap-4">
        {/* Profile Photo or Logo */}
        {guide.profile_photo_url ? (
          <img 
            src={guide.profile_photo_url} 
            alt={displayName} 
            className="h-16 w-16 rounded-full object-cover border-2 border-sand-200"
          />
        ) : guide.logo_url ? (
          <img 
            src={guide.logo_url} 
            alt={displayName} 
            className="h-16 w-16 rounded-full object-contain bg-sand-100 border-2 border-sand-200"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shrink-0 border-2 border-sand-200">
            <span className="text-white font-display text-xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-sand-900">
              {displayName}
            </h3>
          </div>
          
          {/* Star Rating - Always shown, 5 stars default if no reviews */}
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-sand-300'
                }`}
              />
            ))}
            {hasRating && (
              <>
                <span className="ml-1 text-sm font-medium text-sand-700">
                  {rating.toFixed(1)}
                </span>
                <span className="text-xs text-sand-500">
                  ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </>
            )}
          </div>

          {guide.bio && (
            <p className="text-sm text-sand-600 mt-1 leading-relaxed">
              {guide.bio}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

