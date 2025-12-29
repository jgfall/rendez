'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { DollarSign, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { CashOutModal } from './cash-out-modal';

interface RevenueSummaryProps {
  totalReceived: number;
  availableForCashOut: number;
  pendingAmount: number;
  currency: string;
}

export function RevenueSummary({
  totalReceived,
  availableForCashOut,
  pendingAmount,
  currency,
}: RevenueSummaryProps) {
  const [showCashOutModal, setShowCashOutModal] = useState(false);

  return (
    <>
    <div className="grid gap-6 md:grid-cols-2">
      {/* Available for Cash Out */}
      <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-emerald-900 mb-1">
              Available for Cash Out
            </h3>
            <p className="text-sm text-emerald-700">
              Funds ready to transfer to your account
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          </div>
        </div>
        <div className="text-3xl font-display font-bold text-emerald-900 mb-4">
          {formatPrice(availableForCashOut / 100, currency)}
        </div>
          <Button
            className="w-full"
            onClick={() => setShowCashOutModal(true)}
            disabled={availableForCashOut === 0}
          >
          Cash Out Now
          </Button>
        <p className="text-xs text-emerald-600 mt-2 text-center">
            Choose instant payout or bank transfer
        </p>
      </Card>

      {/* Pending Revenue */}
      <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-warning-50 to-warning-100/50 border-warning-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-warning-900 mb-1">
              Pending Revenue
            </h3>
            <p className="text-sm text-warning-700">
              Expected remainders for tours with deposit paid
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-warning-200 flex items-center justify-center">
            <Clock className="h-6 w-6 text-warning-700" />
          </div>
        </div>
        <div className="text-3xl font-display font-bold text-warning-900 mb-4">
          {formatPrice(pendingAmount / 100, currency)}
        </div>
        <div className="text-sm text-warning-700">
          These remainder amounts will be charged and available for cash out once tours are marked complete.
        </div>
      </Card>
    </div>

    <CashOutModal
      isOpen={showCashOutModal}
      onClose={() => setShowCashOutModal(false)}
      availableAmount={availableForCashOut}
      currency={currency}
    />
    </>
  );
}

