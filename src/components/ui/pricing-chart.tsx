'use client';

import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';

export interface PricingChartProps {
  onSelectPlan?: (plan: 'free' | 'pro') => void;
  showCTA?: boolean;
  className?: string;
  freeHref?: string;
  proHref?: string;
}

export function PricingChart({ 
  onSelectPlan, 
  showCTA = true, 
  className = '',
  freeHref = '/signup',
  proHref = '/signup?plan=pro'
}: PricingChartProps) {
  const router = useRouter();

  const handlePlanSelect = (plan: 'free' | 'pro') => {
    if (onSelectPlan) {
      onSelectPlan(plan);
    } else {
      const href = plan === 'pro' ? proHref : freeHref;
      router.push(href);
    }
  };
  const features = [
    { name: 'Tour templates', free: '1 template', pro: 'Unlimited templates' },
    { name: 'Customization', free: false, pro: true },
    { name: 'White label', free: false, pro: true },
    { name: 'Payment processing', free: 'Stripe fees + 3%', pro: 'No added fees' },
  ];

  return (
    <div className={`grid md:grid-cols-2 gap-6 lg:gap-8 ${className}`}>
      {/* Free Tier */}
      <Card variant="outlined" padding="lg" className="relative">
        <div className="text-center mb-6">
          <h3 className="font-display text-2xl font-light text-sand-900 mb-2">
            Free
          </h3>
          <div className="mb-4">
            <span className="text-4xl font-light text-sand-900">$0</span>
            <span className="text-sand-600 ml-1">/month</span>
          </div>
          <p className="text-sm text-sand-600">
            Perfect for getting started
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              {typeof feature.free === 'boolean' ? (
                feature.free ? (
                  <Check className="h-5 w-5 text-success-500 shrink-0 mt-0.5" />
                ) : (
                  <X className="h-5 w-5 text-sand-300 shrink-0 mt-0.5" />
                )
              ) : (
                <Check className="h-5 w-5 text-success-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sand-900 font-medium text-sm">
                  {feature.name}
                </p>
                {typeof feature.free === 'string' && (
                  <p className="text-sand-600 text-xs mt-0.5">
                    {feature.free}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {showCTA && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handlePlanSelect('free')}
          >
            Get Started
          </Button>
        )}
      </Card>

      {/* Pro Tier */}
      <Card variant="elevated" padding="lg" className="relative border-2 border-primary-200">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="primary" size="sm">
            Most Popular
          </Badge>
        </div>

        <div className="text-center mb-6">
          <h3 className="font-display text-2xl font-light text-sand-900 mb-2">
            Pro
          </h3>
          <div className="mb-4">
            <span className="text-4xl font-light text-sand-900">$29</span>
            <span className="text-sand-600 ml-1">/month</span>
          </div>
          <p className="text-sm text-sand-600">
            For growing businesses
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              {typeof feature.pro === 'boolean' ? (
                feature.pro ? (
                  <Check className="h-5 w-5 text-success-500 shrink-0 mt-0.5" />
                ) : (
                  <X className="h-5 w-5 text-sand-300 shrink-0 mt-0.5" />
                )
              ) : (
                <Check className="h-5 w-5 text-success-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sand-900 font-medium text-sm">
                  {feature.name}
                </p>
                {typeof feature.pro === 'string' && (
                  <p className="text-sand-600 text-xs mt-0.5">
                    {feature.pro}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {showCTA && (
          <Button
            className="w-full"
            onClick={() => handlePlanSelect('pro')}
          >
            Upgrade to Pro
          </Button>
        )}
      </Card>
    </div>
  );
}

