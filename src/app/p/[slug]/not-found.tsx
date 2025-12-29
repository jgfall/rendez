import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="font-display text-4xl font-bold text-sand-900 mb-4">
          Proposal Not Found
        </h1>
        <p className="text-sand-600 mb-8">
          The proposal you're looking for doesn't exist or may have been removed.
        </p>
        <Link href="/">
          <Button icon={<ArrowLeft className="h-4 w-4" />}>
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

