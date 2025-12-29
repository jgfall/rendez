import { forwardRef } from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-sand-100 text-sand-700 border border-sand-200',
      primary: 'bg-primary-50 text-primary-700 border border-primary-200',
      secondary: 'bg-ocean-50 text-ocean-700 border border-ocean-200',
      success: 'bg-green-50 text-green-700 border border-green-200',
      warning: 'bg-amber-50 text-amber-700 border border-amber-200',
      danger: 'bg-red-50 text-red-700 border border-red-200',
      outline: 'bg-transparent text-sand-600 border-2 border-sand-300',
    };

    const sizes = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-1',
    };

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center font-medium rounded-full
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };

// Status badge specifically for proposals
export type ProposalStatusType = 'draft' | 'sent' | 'viewed' | 'deposit_paid' | 'confirmed' | 'archived';

const statusConfig: Record<ProposalStatusType, { label: string; variant: BadgeProps['variant'] }> = {
  draft: { label: 'Draft', variant: 'default' },
  sent: { label: 'Sent', variant: 'secondary' },
  viewed: { label: 'Viewed', variant: 'primary' },
  deposit_paid: { label: 'Deposit Paid', variant: 'success' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  archived: { label: 'Archived', variant: 'outline' },
};

export function ProposalStatusBadge({ status }: { status: ProposalStatusType }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Visibility badge for blocks
export type BlockVisibilityType = 'public' | 'vague' | 'secret' | 'reveal';

const visibilityConfig: Record<BlockVisibilityType, { label: string; variant: BadgeProps['variant']; icon: string }> = {
  public: { label: 'Public', variant: 'success', icon: '👁' },
  vague: { label: 'Vague', variant: 'warning', icon: '🌫️' },
  secret: { label: 'Secret', variant: 'danger', icon: '🔒' },
  reveal: { label: 'Reveal on confirmation', variant: 'primary', icon: '🎁' },
};

export function BlockVisibilityBadge({ visibility }: { visibility: BlockVisibilityType }) {
  const config = visibilityConfig[visibility];
  return (
    <Badge variant={config.variant} size="sm">
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
}

