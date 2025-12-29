'use client';

import { 
  Clock, 
  MapPin, 
  Users, 
  Calendar,
  Lock,
  Unlock,
  Navigation,
  Utensils,
  Coffee,
  Bed,
  CircleDot,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, Badge, Button } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { GuideCard } from './guide-card';
import type { PublicProposal, PublicBlock, BlockType, BlockVisibility } from '@/types/database';

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  activity: <MapPin className="h-5 w-5" />,
  transport: <Navigation className="h-5 w-5" />,
  meal: <Utensils className="h-5 w-5" />,
  free_time: <Coffee className="h-5 w-5" />,
  accommodation: <Bed className="h-5 w-5" />,
  other: <CircleDot className="h-5 w-5" />,
};

const BLOCK_COLORS: Record<BlockType, string> = {
  activity: 'bg-primary-100 text-primary-700',
  transport: 'bg-ocean-100 text-ocean-700',
  meal: 'bg-amber-100 text-amber-700',
  free_time: 'bg-emerald-100 text-emerald-700',
  accommodation: 'bg-violet-100 text-violet-700',
  other: 'bg-sand-100 text-sand-700',
};

interface ProposalRendererProps {
  proposal: PublicProposal;
  isPreview?: boolean;
  onPayDeposit?: () => void;
  onPayRemainder?: () => void;
  remainderCents?: number | null;
  remainderPaidAt?: string | null;
  guideId?: string | null;
}

export function ProposalRenderer({ 
  proposal, 
  isPreview = false, 
  onPayDeposit,
  onPayRemainder,
  remainderCents,
  remainderPaidAt,
  guideId,
}: ProposalRendererProps) {
  const { tour, client, blocks, guide, is_unlocked } = proposal;
  
  const hasRemainder = remainderCents && remainderCents > 0;
  const remainderPaid = remainderPaidAt !== null;
  
  // Default to USD, but in a real app you'd get this from the guide's profile
  const currency = 'USD'; // TODO: Get from guide profile

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (offsetMinutes: number) => {
    const hours = Math.floor(offsetMinutes / 60);
    const mins = offsetMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const isBlockLocked = (block: PublicBlock) => {
    if (is_unlocked) return false;
    // Check for hide_until_deposit blocks
    if (block.hide_until_deposit) return true;
    // Legacy visibility system
    return block.visibility === 'secret' || block.visibility === 'reveal';
  };

  const isVenueHidden = (block: PublicBlock) => {
    if (is_unlocked) return false;
    // Check for hide_until_deposit blocks
    if (block.hide_until_deposit) return true;
    // Legacy visibility system
    return block.visibility === 'vague' || block.visibility === 'secret' || block.visibility === 'reveal';
  };

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Hero Section */}
      <div className="relative">
        {tour.cover_image_url ? (
          <div className="h-64 sm:h-80 w-full">
            <img
              src={tour.cover_image_url}
              alt={tour.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-sand-950/80 via-sand-950/20 to-transparent" />
          </div>
        ) : (
          <div className="h-64 sm:h-80 w-full bg-gradient-to-br from-primary-500 via-primary-600 to-ocean-600">
            <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
          </div>
        )}

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-lg mx-auto">
            {tour.city && (
              <Badge variant="default" className="mb-3 bg-white/90 backdrop-blur-sm">
                {tour.city}
              </Badge>
            )}
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              {tour.name}
            </h1>
            <div className="flex items-center gap-2">
              {guide.logo_url && (
                <img 
                  src={guide.logo_url} 
                  alt={guide.business_name || guide.full_name || 'Guide'} 
                  className="h-6 w-6 rounded-md object-contain bg-white/90 backdrop-blur-sm"
                />
              )}
              <p className="text-white/90 text-sm">
                {guide.business_name || guide.full_name || 'Your Guide'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Client greeting */}
        <Card variant="glass" padding="md">
          <p className="text-sand-700">
            <span className="font-medium text-sand-900">Hi {client.name}!</span>{' '}
            Here&apos;s your personalized tour proposal.
          </p>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card variant="elevated" padding="sm" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-sand-500">Duration</p>
              <p className="font-medium text-sand-900">{formatDuration(tour.duration_minutes)}</p>
            </div>
          </Card>

          {proposal.group_size && (
            <Card variant="elevated" padding="sm" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-ocean-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-ocean-600" />
              </div>
              <div>
                <p className="text-xs text-sand-500">Group Size</p>
                <p className="font-medium text-sand-900">{proposal.group_size} people</p>
              </div>
            </Card>
          )}

          {proposal.scheduled_at && (
            <Card variant="elevated" padding="sm" className="flex items-center gap-3 col-span-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-sand-500">Scheduled</p>
                <p className="font-medium text-sand-900">
                  {format(new Date(proposal.scheduled_at), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Guide Card */}
        {(guide.business_name || guide.full_name || guide.bio) && (
          <GuideCard guide={guide} />
        )}

        {/* Description */}
        {tour.description && (
          <Card variant="default" padding="md">
            <h2 className="font-display text-xl font-semibold text-sand-900 mb-2">
              About This Tour
            </h2>
            <p className="text-sand-600 leading-relaxed">{tour.description}</p>
          </Card>
        )}

        {/* Itinerary */}
        <div>
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold text-sand-900">
              Your Itinerary
            </h2>
          
          </div>

          <div className="space-y-3">
            {blocks.map((block, index) => (
              <ItineraryBlock
                key={block.id}
                block={block}
                index={index}
                isLocked={isBlockLocked(block)}
                isUnlocked={is_unlocked}
              />
            ))}
          </div>
        </div>

        {/* Pricing & CTA */}
        <Card variant="elevated" padding="lg" className="sticky bottom-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              {proposal.total_price_cents && (
                <p className="text-sm text-sand-500">Total</p>
              )}
              <p className="font-display text-2xl font-bold text-sand-900">
                {proposal.total_price_cents 
                  ? formatPrice(proposal.total_price_cents / 100, currency)
                  : formatPrice(proposal.deposit_cents / 100, currency) + ' deposit'
                }
              </p>
            </div>
            {is_unlocked ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <Unlock className="h-5 w-5" />
                <span className="font-medium">Confirmed!</span>
              </div>
            ) : (
              <Badge variant="warning">
                {formatPrice(proposal.deposit_cents / 100, currency)} deposit to confirm
              </Badge>
            )}
          </div>

          {!is_unlocked && !isPreview && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={onPayDeposit}
              icon={<Sparkles className="h-4 w-4" />}
            >
              {`Reserve with ${formatPrice(proposal.deposit_cents / 100, currency)} Deposit`}
            </Button>
          )}

          {is_unlocked && !hasRemainder && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 text-center">
              🎉 Your tour is confirmed! Check your email for details.
            </div>
          )}

          {is_unlocked && hasRemainder && !remainderPaid && onPayRemainder && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-warning-50 border border-warning-200 text-sm text-warning-700">
                <p className="font-medium mb-1">Remaining Balance Due</p>
                <p className="text-xs">Please complete payment for the remainder of your tour.</p>
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={onPayRemainder}
                icon={<Sparkles className="h-4 w-4" />}
              >
                Pay Remainder {formatPrice(remainderCents! / 100, currency)}
              </Button>
            </div>
          )}

          {is_unlocked && hasRemainder && remainderPaid && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 text-center">
              ✅ Payment complete! Your tour is fully paid.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface ItineraryBlockProps {
  block: PublicBlock;
  index: number;
  isLocked: boolean;
  isUnlocked: boolean;
}

function ItineraryBlock({ block, index, isLocked, isUnlocked }: ItineraryBlockProps) {
  const icon = BLOCK_ICONS[block.type];
  const colorClass = BLOCK_COLORS[block.type];

  const formatTime = (offsetMinutes: number) => {
    const hours = Math.floor(offsetMinutes / 60);
    const mins = offsetMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Card 
      variant={isLocked ? 'outlined' : 'default'} 
      padding="none"
      className={`overflow-hidden ${isLocked ? 'border-dashed bg-sand-50/50' : ''}`}
    >
      <div className="flex">
        {/* Timeline */}
        <div className="flex flex-col items-center py-4 px-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorClass}`}>
            {isLocked ? <Lock className="h-5 w-5" /> : icon}
          </div>
          {index < 10 && (
            <div className="flex-1 w-0.5 bg-sand-200 mt-2" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 py-4 pr-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs text-sand-500 mb-0.5">
                {formatTime(block.start_offset_minutes)}
              </p>
              <h3 className="font-display text-lg font-semibold text-sand-900">
                {block.client_title}
              </h3>
            </div>
          
          </div>

          {isLocked ? (
            <div className="mt-2 p-3 rounded-lg bg-sand-100/50 border border-dashed border-sand-300">
              <p className="text-sm text-sand-500 italic flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Details revealed after paying deposit
              </p>
            </div>
          ) : (
            <>
              {block.description && (
                <p className="mt-1 text-sm text-sand-600">{block.description}</p>
              )}
              
              {/* Show address after deposit, neighborhood before deposit */}
              {isUnlocked && (block as any).address && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-sand-400" />
                  <span className="text-sand-600">
                    {(block as any).address}
                  </span>
                </div>
              )}
              {!isUnlocked && block.neighborhood && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-sand-400" />
                  <span className="text-sand-600">
                    {block.neighborhood}
                  </span>
                </div>
              )}

              {block.image_url && (
                <img
                  src={block.image_url}
                  alt={block.client_title}
                  className="mt-3 rounded-lg w-full h-32 object-cover"
                />
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

