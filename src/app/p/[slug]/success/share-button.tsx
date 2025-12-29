'use client';

import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface ShareButtonProps {
  slug: string;
  tourName: string;
}

export function ShareButton({ slug, tourName }: ShareButtonProps) {
  const handleShare = () => {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/p/${slug}`;
    
    if (navigator.share) {
      navigator.share({
        title: tourName,
        text: `Check out this tour: ${tourName}`,
        url: url,
      }).catch(() => {
        // Fallback to copy
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      });
    } else {
      // Fallback to copy
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <Button
      size="lg"
      variant="outline"
      className="w-full whitespace-nowrap"
      icon={<Share2 className="h-4 w-4" />}
      onClick={handleShare}
    >
      Share with a friend
    </Button>
  );
}

