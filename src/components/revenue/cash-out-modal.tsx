'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Building2, Zap, Clock, X, Plus, Check } from 'lucide-react';
import { Modal, Button, Card } from '@/components/ui';
import { formatPrice } from '@/lib/utils';

interface CashOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAmount: number; // in cents
  currency: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  isDefault: boolean;
}

export function CashOutModal({ isOpen, onClose, availableAmount, currency }: CashOutModalProps) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<'instant' | 'bank'>('instant');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<PaymentMethod[]>([
    // Mock data - replace with actual API call
    { id: '1', type: 'card', last4: '4242', brand: 'Visa', isDefault: true },
  ]);
  const [savedBanks, setSavedBanks] = useState<PaymentMethod[]>([
    // Mock data - replace with actual API call
    { id: '1', type: 'bank', last4: '0001', isDefault: true },
  ]);
  const [addingCard, setAddingCard] = useState(false);
  const [processing, setProcessing] = useState(false);

  const amount = availableAmount / 100;
  
  // Instant payout fee: 1.5% + $0.25 (example)
  const instantFeePercent = 0.015;
  const instantFeeFixed = 0.25;
  const instantFee = (amount * instantFeePercent) + instantFeeFixed;
  const instantAmount = amount - instantFee;
  
  // Bank transfer: free but takes 1-3 business days
  const bankFee = 0;
  const bankAmount = amount;

  const handleCashOut = async () => {
    // Get selected payment method
    const paymentMethodId = selectedMethod === 'instant' 
      ? (selectedPaymentMethodId || savedCards.find(c => c.isDefault)?.id || savedCards[0]?.id)
      : null;
    const bankAccountId = selectedMethod === 'bank'
      ? (selectedPaymentMethodId || savedBanks.find(b => b.isDefault)?.id || savedBanks[0]?.id)
      : null;

    if (!paymentMethodId && selectedMethod === 'instant') {
      alert('Please select a payment method');
      return;
    }

    if (!bankAccountId && selectedMethod === 'bank') {
      alert('Please select a bank account');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/revenue/cash-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          amount: availableAmount,
          paymentMethodId: paymentMethodId || undefined,
          bankAccountId: bankAccountId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show more detailed error message if available
        const errorMessage = data.error || 'Failed to process cash out';
        let details = '';
        if (data.details) {
          const available = (data.details.available || 0) / 100;
          const requested = (data.details.requested || 0) / 100;
          if (available === 0 && requested > 0) {
            details = '. Your available balance may have changed. Please refresh the page to see the current balance.';
          } else {
            details = ` (Available: ${formatPrice(available, currency)}, Requested: ${formatPrice(requested, currency)})`;
          }
        }
        throw new Error(errorMessage + details);
      }

      // Refresh the page to update available amount
      router.refresh();
      
      alert(`${selectedMethod === 'instant' ? 'Instant' : 'Bank'} payout initiated successfully!`);
      onClose();
    } catch (error) {
      console.error('Cash out error:', error);
      alert(error instanceof Error ? error.message : 'Failed to process cash out. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddCard = () => {
    setAddingCard(true);
    // TODO: Open Stripe payment method setup
    // This would typically open Stripe Elements or redirect to Stripe
    setTimeout(() => {
      setAddingCard(false);
      // Mock: add new card
      setSavedCards([...savedCards, { id: '2', type: 'card', last4: '1234', brand: 'Mastercard', isDefault: false }]);
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cash Out"
      size="lg"
    >
      <div className="space-y-6">
        {/* Available Amount */}
        <div className="text-center p-6 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-sm text-emerald-700 mb-2">Available to cash out</p>
          <p className="text-4xl font-display font-bold text-emerald-900">
            {formatPrice(amount, currency)}
          </p>
        </div>

        {/* Payment Method Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Instant Payout Option */}
          <button
            onClick={() => setSelectedMethod('instant')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              selectedMethod === 'instant'
                ? 'border-primary-500 bg-primary-50'
                : 'border-sand-200 bg-white hover:border-sand-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  selectedMethod === 'instant' ? 'bg-primary-100' : 'bg-sand-100'
                }`}>
                  <Zap className={`h-5 w-5 ${
                    selectedMethod === 'instant' ? 'text-primary-600' : 'text-sand-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sand-900">Instant Payout</h3>
                  <p className="text-xs text-sand-500">To card</p>
                </div>
              </div>
              {selectedMethod === 'instant' && (
                <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-sand-600">You receive:</span>
                <span className="font-semibold text-sand-900">
                  {formatPrice(instantAmount, currency)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-sand-500">
                <span>Fee ({instantFeePercent * 100}% + {formatPrice(instantFeeFixed, currency)}):</span>
                <span>{formatPrice(instantFee, currency)}</span>
              </div>
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Arrives in minutes
              </p>
            </div>
          </button>

          {/* Bank Transfer Option */}
          <button
            onClick={() => setSelectedMethod('bank')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              selectedMethod === 'bank'
                ? 'border-primary-500 bg-primary-50'
                : 'border-sand-200 bg-white hover:border-sand-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  selectedMethod === 'bank' ? 'bg-primary-100' : 'bg-sand-100'
                }`}>
                  <Building2 className={`h-5 w-5 ${
                    selectedMethod === 'bank' ? 'text-primary-600' : 'text-sand-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sand-900">Bank Transfer</h3>
                  <p className="text-xs text-sand-500">To bank account</p>
                </div>
              </div>
              {selectedMethod === 'bank' && (
                <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-sand-600">You receive:</span>
                <span className="font-semibold text-sand-900">
                  {formatPrice(bankAmount, currency)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-sand-500">
                <span>Fee:</span>
                <span>Free</span>
              </div>
              <p className="text-xs text-sand-500 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                1-3 business days
              </p>
            </div>
          </button>
        </div>

        {/* Payment Method Selection */}
        {selectedMethod === 'instant' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-sand-700">Select Card</label>
              <button
                onClick={handleAddCard}
                disabled={addingCard}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Card
              </button>
            </div>
            <div className="space-y-2">
              {savedCards.map((card) => {
                const isSelected = selectedPaymentMethodId === card.id || (!selectedPaymentMethodId && card.isDefault);
                return (
                  <button
                    key={card.id}
                    onClick={() => setSelectedPaymentMethodId(card.id)}
                    className={`w-full p-3 rounded-lg border transition-colors text-left flex items-center justify-between ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-sand-200 bg-white hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-sand-400" />
                      <div>
                        <p className="text-sm font-medium text-sand-900">
                          {card.brand} •••• {card.last4}
                        </p>
                        {card.isDefault && (
                          <p className="text-xs text-sand-500">Default</p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedMethod === 'bank' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-sand-700">Select Bank Account</label>
              <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Bank
              </button>
            </div>
            <div className="space-y-2">
              {savedBanks.map((bank) => {
                const isSelected = selectedPaymentMethodId === bank.id || (!selectedPaymentMethodId && bank.isDefault);
                return (
                  <button
                    key={bank.id}
                    onClick={() => setSelectedPaymentMethodId(bank.id)}
                    className={`w-full p-3 rounded-lg border transition-colors text-left flex items-center justify-between ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-sand-200 bg-white hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-sand-400" />
                      <div>
                        <p className="text-sm font-medium text-sand-900">
                          •••• {bank.last4}
                        </p>
                        {bank.isDefault && (
                          <p className="text-xs text-sand-500">Default</p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="p-4 rounded-xl bg-sand-50 border border-sand-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-sand-600">Total amount</span>
            <span className="font-semibold text-sand-900">{formatPrice(amount, currency)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-sand-600">
              {selectedMethod === 'instant' ? 'Fee' : 'Processing fee'}
            </span>
            <span className="text-sm text-sand-600">
              {selectedMethod === 'instant' ? `-${formatPrice(instantFee, currency)}` : 'Free'}
            </span>
          </div>
          <div className="border-t border-sand-200 pt-2 mt-2 flex justify-between items-center">
            <span className="font-medium text-sand-900">You'll receive</span>
            <span className="text-xl font-display font-bold text-sand-900">
              {formatPrice(selectedMethod === 'instant' ? instantAmount : bankAmount, currency)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleCashOut}
            loading={processing}
            disabled={processing || availableAmount === 0}
          >
            {selectedMethod === 'instant' ? 'Cash Out Instantly' : 'Send to Bank'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

