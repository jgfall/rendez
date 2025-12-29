import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price (stored as whole number) in the given currency
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert a whole number price to cents for Stripe
 */
export function priceToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert cents to whole number price
 */
export function centsToPrice(cents: number): number {
  return Math.round(cents / 100);
}

