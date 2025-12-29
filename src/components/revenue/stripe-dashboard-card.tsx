'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { ExternalLink, CreditCard } from 'lucide-react';

export function StripeDashboardCard() {
  const [loading, setLoading] = useState(false);

  const handleOpenDashboard = async () => {
    setLoading(true);
    try {
      const appUrl = window.location.origin;
      const returnUrl = `${appUrl}/app/revenue?stripe_return=true`;
      const refreshUrl = `${appUrl}/app/revenue?stripe_refresh=true`;

      const response = await fetch('/api/stripe/connect/create-account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: returnUrl, refresh_url: refreshUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open Stripe dashboard');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
      alert(error instanceof Error ? error.message : 'Failed to open Stripe dashboard');
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-ocean-50 to-ocean-100/50 border-ocean-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-display text-xl font-semibold text-ocean-900 mb-1">
            Manage Your Funds
          </h3>
          <p className="text-sm text-ocean-700 mb-4">
            All payments go directly to your Stripe Express account. View your balance, manage payouts, and access your financial dashboard in Stripe.
          </p>
          <Button
            onClick={handleOpenDashboard}
            loading={loading}
            variant="outline"
            icon={<ExternalLink className="h-4 w-4" />}
          >
            Open Stripe Dashboard
          </Button>
        </div>
        <div className="h-16 w-16 rounded-xl bg-ocean-200 flex items-center justify-center ml-4">
          <CreditCard className="h-8 w-8 text-ocean-700" />
        </div>
      </div>
    </Card>
  );
}

