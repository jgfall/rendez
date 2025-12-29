'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X, Sparkles, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, Card } from '@/components/ui';
import { UpgradeModal } from '@/components/subscriptions/upgrade-modal';
import { isSubscriptionActive } from '@/lib/subscriptions';
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/database';

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status, stripe_subscription_id, subscription_current_period_end, subscription_cancel_at_period_end')
        .eq('id', user.id)
        .single();

      if (profile) {
        setSubscriptionPlan(profile.subscription_plan || 'free');
        setSubscriptionStatus(profile.subscription_status);
        setStripeSubscriptionId(profile.stripe_subscription_id);
        setCurrentPeriodEnd(profile.subscription_current_period_end);
        setCancelAtPeriodEnd(profile.subscription_cancel_at_period_end || false);
      }

      setLoading(false);

      // Check for success/cancel from checkout
      const success = searchParams.get('success');
      const canceled = searchParams.get('canceled');
      
      if (success) {
        // Refresh subscription data after successful checkout
        setTimeout(() => {
          window.location.href = '/app/settings/subscription';
        }, 2000);
      }
    };

    fetchSubscription();
  }, [supabase, router, searchParams]);

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (!profile?.stripe_customer_id) {
        alert('No subscription found');
        setManagingSubscription(false);
        return;
      }

      // Create Stripe customer portal session
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: profile.stripe_customer_id }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        setManagingSubscription(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to create portal session:', err);
      alert('Failed to open subscription management. Please try again.');
      setManagingSubscription(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="text-sand-600">Loading subscription...</div>
        </div>
      </div>
    );
  }

  const isActive = isSubscriptionActive(subscriptionStatus);
  const isPro = subscriptionPlan === 'pro';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-5xl font-bold text-sand-900 mb-2">
          Subscription
        </h1>
        <p className="text-sand-600">Manage your plan and billing</p>
      </div>

      {searchParams.get('success') && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
          ✅ Subscription activated! Your account has been upgraded to Pro.
        </div>
      )}

      {searchParams.get('canceled') && (
        <div className="mb-6 p-4 rounded-xl bg-warning-50 border border-warning-200 text-warning-700">
          Subscription checkout was canceled.
        </div>
      )}

      <div className="space-y-6">
        {/* Current Plan */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-sand-900 mb-2">
                Current Plan
              </h2>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isPro 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-sand-100 text-sand-700'
                }`}>
                  {isPro ? 'Pro' : 'Free'}
                </div>
                {isActive && (
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                    Active
                  </div>
                )}
                {cancelAtPeriodEnd && (
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-warning-100 text-warning-700">
                    Cancels at period end
                  </div>
                )}
              </div>
            </div>
            {!isPro && (
              <Button
                onClick={() => setShowUpgradeModal(true)}
                icon={<Sparkles className="h-4 w-4" />}
              >
                Upgrade to Pro
              </Button>
            )}
          </div>

          {isPro && (
            <div className="space-y-4 pt-6 border-t border-sand-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-sand-600 mb-1">Next billing date</div>
                  <div className="font-medium text-sand-900">
                    {formatDate(currentPeriodEnd)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-sand-600 mb-1">Status</div>
                  <div className="font-medium text-sand-900 capitalize">
                    {subscriptionStatus || 'Unknown'}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleManageSubscription}
                loading={managingSubscription}
                variant="outline"
                icon={<CreditCard className="h-4 w-4" />}
              >
                Manage Subscription
              </Button>
            </div>
          )}
        </Card>

        {/* Plan Features */}
        <Card variant="elevated" padding="lg">
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-6">
            Plan Features
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {isPro ? (
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <X className="h-5 w-5 text-sand-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-sand-900">
                  {isPro ? 'Unlimited' : '1'} tour template{isPro ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {isPro ? (
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <X className="h-5 w-5 text-sand-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-sand-900">Platform fees</p>
                <p className="text-sm text-sand-600">
                  {isPro ? 'No additional fees' : '3% platform fee on top of Stripe fees'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {isPro ? (
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <X className="h-5 w-5 text-sand-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-sand-900">White label & custom branding</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {isPro ? (
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <X className="h-5 w-5 text-sand-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-sand-900">Priority support</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}

