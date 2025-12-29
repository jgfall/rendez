/**
 * Subscription utility functions
 * Handles plan limits and feature checks
 */

export type SubscriptionPlan = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid';

export interface SubscriptionLimits {
  maxTourTemplates: number;
  maxProposalsPerMonth?: number;
  hasWhiteLabel: boolean;
  hasCustomBranding: boolean;
  platformFeePercent: number; // Additional platform fee for free plans
}

/**
 * Get subscription limits for a plan
 */
export function getPlanLimits(plan: SubscriptionPlan): SubscriptionLimits {
  switch (plan) {
    case 'free':
      return {
        maxTourTemplates: 1,
        hasWhiteLabel: false,
        hasCustomBranding: false,
        platformFeePercent: 3.0, // 3% platform fee on top of Stripe fees
      };
    case 'pro':
      return {
        maxTourTemplates: Infinity,
        hasWhiteLabel: true,
        hasCustomBranding: true,
        platformFeePercent: 0, // No additional platform fee
      };
    default:
      return getPlanLimits('free');
  }
}

/**
 * Check if user has active subscription
 */
export function isSubscriptionActive(status: SubscriptionStatus | null | undefined): boolean {
  if (!status) return false;
  return status === 'active' || status === 'trialing';
}

/**
 * Check if user can create more tour templates
 */
export function canCreateTourTemplate(
  plan: SubscriptionPlan,
  currentTemplateCount: number
): boolean {
  const limits = getPlanLimits(plan);
  return currentTemplateCount < limits.maxTourTemplates;
}

/**
 * Check if user has access to a feature
 */
export function hasFeatureAccess(
  plan: SubscriptionPlan,
  feature: 'whiteLabel' | 'customBranding' | 'unlimitedTemplates'
): boolean {
  const limits = getPlanLimits(plan);
  
  switch (feature) {
    case 'whiteLabel':
      return limits.hasWhiteLabel;
    case 'customBranding':
      return limits.hasCustomBranding;
    case 'unlimitedTemplates':
      return limits.maxTourTemplates === Infinity;
    default:
      return false;
  }
}

/**
 * Get platform fee percentage for a plan
 */
export function getPlatformFeePercent(plan: SubscriptionPlan): number {
  return getPlanLimits(plan).platformFeePercent;
}

