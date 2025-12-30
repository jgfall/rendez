'use client';

import { X, Sparkles, Check } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (planType: 'monthly' | 'yearly') => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to create subscription:', err);
      alert('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card variant="elevated" padding="lg" className="max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-sand-400 hover:text-sand-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
            <Sparkles className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-sand-900 mb-2">
            Upgrade to Pro
          </h2>
          {reason && (
            <p className="text-sand-600 mb-4">{reason}</p>
          )}
          <p className="text-sand-600">
            Unlock unlimited tour templates and more features
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sand-900">Unlimited tour templates</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sand-900">No platform fees</p>
              <p className="text-sm text-sand-600">Save 3% on every transaction</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sand-900">White label & custom branding</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sand-900">Priority support</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleUpgrade('monthly')}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Loading...' : 'Upgrade - $29/month'}
          </Button>
          <Button
            onClick={() => handleUpgrade('yearly')}
            disabled={loading}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {loading ? 'Loading...' : 'Upgrade - $274/year (Save 20%)'}
          </Button>
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-sand-500 hover:text-sand-700"
          >
            Maybe later
          </button>
        </div>
      </Card>
    </div>
  );
}

