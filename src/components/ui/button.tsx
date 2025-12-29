'use client';

import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'default';
  loading?: boolean;
  icon?: React.ReactNode;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, disabled, icon, asChild = false, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    const variants = {
      default: 'bg-primary-500 text-white shadow-sm shadow-black/5 hover:bg-primary-600',
      primary: 'bg-gradient-to-b from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg shadow-primary-500/30 focus:ring-primary-500 focus:ring-offset-2 active:shadow-md',
      secondary: 'bg-gradient-to-b from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700 text-white shadow-lg shadow-ocean-500/30 focus:ring-ocean-500 focus:ring-offset-2 active:shadow-md',
      outline: 'border-2 border-sand-300 bg-white hover:bg-sand-50 hover:border-sand-400 text-sand-800 focus:ring-sand-400 focus:ring-offset-2 hover:shadow-sm',
      ghost: 'bg-transparent hover:bg-sand-100/80 text-sand-700 hover:text-sand-900 focus:ring-sand-300 focus:ring-offset-2',
      danger: 'bg-gradient-to-b from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 text-white shadow-lg shadow-danger-500/30 focus:ring-danger-500 focus:ring-offset-2 active:shadow-md',
    };

    const sizes = {
      default: 'h-9 px-4 py-2 rounded-lg',
      sm: 'text-sm px-3 py-1.5 rounded-lg h-8',
      md: 'text-sm px-4 py-2.5 rounded-xl',
      lg: 'text-base px-6 py-3 rounded-xl h-10',
    };

    const Comp = asChild ? Slot : 'button';
    
    // Don't render loading/icon when asChild is true
    const content = asChild ? children : (
      <>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </>
    );

    return (
      <Comp
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button };

