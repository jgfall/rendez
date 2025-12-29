'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Textarea, Select, Card, Badge, ImageUpload, JollyTimeField } from '@/components/ui';
import { Time, parseTime } from '@internationalized/date';
import { SortableBlock } from './block-editor';
import { BlockCreateModal } from './block-create-modal';
import { ProposalRenderer } from '@/components/proposal/proposal-renderer';
import { UpgradeModal } from '@/components/subscriptions/upgrade-modal';
import { formatPrice } from '@/lib/utils';
import { canCreateTourTemplate, isSubscriptionActive, getPlanLimits } from '@/lib/subscriptions';
import type { TourTemplate, TourBlock, BlockType, BlockVisibility, PriceMode, SubscriptionPlan } from '@/types/database';

interface TourEditorProps {
  tour?: TourTemplate;
  blocks?: TourBlock[];
}

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: 'activity', label: 'Activity' },
  { value: 'transport', label: 'Transport' },
  { value: 'meal', label: 'Meal' },
  { value: 'free_time', label: 'Free Time' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'other', label: 'Other' },
];

const PRICE_MODES: { value: PriceMode; label: string }[] = [
  { value: 'per_person', label: 'Per Person' },
  { value: 'flat', label: 'Flat Rate' },
];

export type LocalBlock = Omit<TourBlock, 'tour_id' | 'guide_id' | 'created_at' | 'updated_at'> & {
  _isNew?: boolean;
  _isDeleted?: boolean;
  duration_minutes?: number;
  hide_until_deposit?: boolean;
  pre_deposit_title?: string | null;
  pre_deposit_description?: string | null;
  post_deposit_title?: string | null;
  post_deposit_description?: string | null;
};

export function TourEditor({ tour, blocks = [] }: TourEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const isNew = !tour;

  // Subscription and profile state
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [tourCount, setTourCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch currency and subscription from profile
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('currency, subscription_plan, subscription_status')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.currency) {
        setCurrency(profile.currency);
      }
        if (profile.subscription_plan) {
          setSubscriptionPlan(profile.subscription_plan);
        }
        if (profile.subscription_status) {
          setSubscriptionStatus(profile.subscription_status);
        }
      }

      // Get tour count
      const { count } = await supabase
        .from('tour_templates')
        .select('*', { count: 'exact', head: true })
        .eq('guide_id', user.id);

      setTourCount(count || 0);
    };

    fetchProfile();
  }, [supabase]);

  // Tour state
  const [name, setName] = useState(tour?.name || '');
  const [city, setCity] = useState(tour?.city || '');
  const [priceMode, setPriceMode] = useState<PriceMode>(tour?.price_mode || 'per_person');
  const [basePrice, setBasePrice] = useState(tour ? (tour.base_price_cents / 100) : 0);
  const [description, setDescription] = useState(tour?.description || '');
  const [coverImageUrl, setCoverImageUrl] = useState(tour?.cover_image_url || '');
  const [currency, setCurrency] = useState('USD');
  
  // Time-bound scheduling
  const [isTimeBound, setIsTimeBound] = useState(tour?.is_time_bound || false);
  const [allowedDaysOfWeek, setAllowedDaysOfWeek] = useState<number[]>(tour?.allowed_days_of_week || []);
  
  // Convert time string (HH:MM:SS or HH:MM) to Time object
  const parseTimeString = (timeStr: string | null | undefined): Time | null => {
    if (!timeStr) return null;
    try {
      // Handle both HH:MM:SS and HH:MM formats
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        const hour = parseInt(parts[0], 10);
        const minute = parseInt(parts[1], 10);
        if (!isNaN(hour) && !isNaN(minute)) {
          return new Time(hour, minute);
        }
      }
    } catch (e) {
      console.error('Error parsing time:', e);
    }
    return null;
  };

  // Convert Time object to HH:MM:SS string for database
  const formatTimeForDB = (time: Time | null): string | null => {
    if (!time) return null;
    return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:00`;
  };

  const [preferredStartTime, setPreferredStartTime] = useState<Time | null>(
    parseTimeString(tour?.preferred_start_time)
  );
  
  // Initialize time-bound fields from tour if available
  useEffect(() => {
    if (tour) {
      setIsTimeBound(tour.is_time_bound || false);
      setAllowedDaysOfWeek(tour.allowed_days_of_week || []);
      setPreferredStartTime(parseTimeString(tour.preferred_start_time));
    }
  }, [tour]);

  // Blocks state
  const [localBlocks, setLocalBlocks] = useState<LocalBlock[]>(
    blocks.map(b => ({ ...b }))
  );
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'before' | 'after' | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update sort_order and recalculate start offsets
        return recalculateStartOffsets(newItems.map((item, index) => ({ ...item, sort_order: index })));
      });
    }
  };

  // Recalculate start offsets based on block durations
  const recalculateStartOffsets = (blocks: LocalBlock[]): LocalBlock[] => {
    const sortedBlocks = [...blocks].filter(b => !b._isDeleted).sort((a, b) => a.sort_order - b.sort_order);
    let currentTime = 0;
    
    return blocks.map(block => {
      if (block._isDeleted) return block;
      const sortedIndex = sortedBlocks.findIndex(b => b.id === block.id);
      if (sortedIndex === -1) return block;
      
      // Calculate start offset from previous blocks
      let startOffset = 0;
      for (let i = 0; i < sortedIndex; i++) {
        const prevBlock = sortedBlocks[i];
        const prevDuration = (prevBlock as any).duration_minutes || 60;
        startOffset += prevDuration;
      }
      
      return { ...block, start_offset_minutes: startOffset };
    });
  };

  const addBlock = () => {
    setShowCreateModal(true);
  };

  // Calculate total duration from blocks
  const calculateTotalDuration = () => {
    const activeBlocks = localBlocks.filter(b => !b._isDeleted);
    return activeBlocks.reduce((total, block) => {
      const duration = (block as any).duration_minutes || 60;
      return total + duration;
    }, 0);
  };

  const totalDurationMinutes = calculateTotalDuration();

  // Calculate previous block end time for new blocks
  const getPreviousBlockEndTime = () => {
    const activeBlocks = localBlocks.filter(b => !b._isDeleted).sort((a, b) => a.sort_order - b.sort_order);
    if (activeBlocks.length === 0) return 0;
    
    const lastBlock = activeBlocks[activeBlocks.length - 1];
    const lastBlockStart = lastBlock.start_offset_minutes || 0;
    const lastBlockDuration = (lastBlock as any).duration_minutes || 60;
    return lastBlockStart + lastBlockDuration;
  };

  const handleBlockCreated = (newBlock: LocalBlock) => {
    newBlock.sort_order = localBlocks.length;
    // Calculate start offset from previous blocks
    newBlock.start_offset_minutes = getPreviousBlockEndTime();
    setLocalBlocks([...localBlocks, newBlock]);
    setExpandedBlock(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<LocalBlock>) => {
    const updatedBlocks = localBlocks.map(b => 
      b.id === id ? { ...b, ...updates } : b
    );
    
    // If duration changed, recalculate start offsets
    if ((updates as any).duration_minutes !== undefined) {
      setLocalBlocks(recalculateStartOffsets(updatedBlocks));
    } else {
      setLocalBlocks(updatedBlocks);
    }
  };

  const deleteBlock = (id: string) => {
    const block = localBlocks.find(b => b.id === id);
    if (block?._isNew) {
      setLocalBlocks(localBlocks.filter(b => b.id !== id));
    } else {
      setLocalBlocks(localBlocks.map(b => 
        b.id === id ? { ...b, _isDeleted: true } : b
      ));
    }
    if (expandedBlock === id) setExpandedBlock(null);
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let tourId = tour?.id;

      // Calculate duration from blocks
      const calculatedDuration = calculateTotalDuration();

      // Check subscription limits before creating new tour
      if (isNew) {
        const canCreate = canCreateTourTemplate(subscriptionPlan, tourCount);
        
        if (!canCreate) {
          setShowUpgradeModal(true);
          setSaving(false);
          return;
        }
      }

      // Create or update tour
      if (isNew) {
        const { data: newTour, error: tourError } = await supabase
          .from('tour_templates')
          .insert({
            guide_id: user.id,
            name,
            city: city || null,
            duration_minutes: calculatedDuration || 180, // Default to 180 if no blocks
            price_mode: priceMode,
            base_price_cents: Math.round(basePrice * 100), // Convert to cents for storage
            description: description || null,
            cover_image_url: coverImageUrl || null,
            is_time_bound: isTimeBound,
            allowed_days_of_week: isTimeBound && allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : null,
            preferred_start_time: isTimeBound && preferredStartTime ? formatTimeForDB(preferredStartTime) : null,
          })
          .select()
          .single();

        if (tourError) throw tourError;
        tourId = newTour.id;
      } else {
        const { error: tourError } = await supabase
          .from('tour_templates')
          .update({
            name,
            city: city || null,
            duration_minutes: calculatedDuration || 180, // Default to 180 if no blocks
            price_mode: priceMode,
            base_price_cents: Math.round(basePrice * 100), // Convert to cents for storage
            description: description || null,
            cover_image_url: coverImageUrl || null,
            is_time_bound: isTimeBound,
            allowed_days_of_week: isTimeBound && allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : null,
            preferred_start_time: isTimeBound && preferredStartTime ? formatTimeForDB(preferredStartTime) : null,
          })
          .eq('id', tour.id);

        if (tourError) throw tourError;
      }

      // Handle blocks
      const blocksToDelete = localBlocks.filter(b => b._isDeleted && !b._isNew);
      const blocksToCreate = localBlocks.filter(b => b._isNew && !b._isDeleted);
      const blocksToUpdate = localBlocks.filter(b => !b._isNew && !b._isDeleted);

      // Delete blocks
      if (blocksToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('tour_blocks')
          .delete()
          .in('id', blocksToDelete.map(b => b.id));

        if (deleteError) throw deleteError;
      }

      // Create blocks
      if (blocksToCreate.length > 0) {
        const { error: createError } = await supabase
          .from('tour_blocks')
          .insert(blocksToCreate.map(b => ({
            tour_id: tourId!,
            guide_id: user.id,
            sort_order: b.sort_order,
            type: b.type,
            client_title: b.client_title,
            description: b.description,
            teaser_description: (b as any).teaser_description || null,
            start_offset_minutes: b.start_offset_minutes,
            duration_minutes: (b as any).duration_minutes || 60,
            image_url: b.image_url,
            visibility: b.visibility,
            venue_name: b.venue_name,
            neighborhood: b.neighborhood,
            address: (b as any).address || null,
            lat: b.lat,
            lng: b.lng,
            hide_until_deposit: (b as any).hide_until_deposit || false,
            pre_deposit_title: (b as any).pre_deposit_title || null,
            pre_deposit_description: (b as any).pre_deposit_description || null,
            post_deposit_title: (b as any).post_deposit_title || null,
            post_deposit_description: (b as any).post_deposit_description || null,
          })));

        if (createError) throw createError;
      }

      // Update blocks
      for (const block of blocksToUpdate) {
        const { error: updateError } = await supabase
          .from('tour_blocks')
          .update({
            sort_order: block.sort_order,
            type: block.type,
            client_title: block.client_title,
            description: block.description,
            teaser_description: (block as any).teaser_description || null,
            start_offset_minutes: block.start_offset_minutes,
            duration_minutes: (block as any).duration_minutes || 60,
            image_url: block.image_url,
            visibility: block.visibility,
            venue_name: block.venue_name,
            neighborhood: block.neighborhood,
            address: (block as any).address || null,
            lat: block.lat,
            lng: block.lng,
            hide_until_deposit: (block as any).hide_until_deposit || false,
            pre_deposit_title: (block as any).pre_deposit_title || null,
            pre_deposit_description: (block as any).pre_deposit_description || null,
            post_deposit_title: (block as any).post_deposit_title || null,
            post_deposit_description: (block as any).post_deposit_description || null,
          })
          .eq('id', block.id);

        if (updateError) throw updateError;
      }

      router.push('/app/tours');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const activeBlocks = localBlocks.filter(b => !b._isDeleted);

  // Preview data
  const previewProposal = {
    id: 'preview',
    slug: 'preview',
    status: 'draft' as const,
    scheduled_at: null,
    group_size: 2,
    total_price_cents: Math.round(basePrice * 2 * 100),
    deposit_cents: Math.round(basePrice * 0.3 * 100),
    is_unlocked: previewMode === 'after',
    tour: {
      name,
      city,
      duration_minutes: totalDurationMinutes || 180,
      description,
      cover_image_url: coverImageUrl,
    },
    client: { name: 'Preview Client' },
    guide: { 
      full_name: 'You',
      business_name: null,
      logo_url: null,
      profile_photo_url: null,
      bio: null,
      average_rating: null,
      review_count: null,
    },
    blocks: activeBlocks.map(b => {
      const hideUntilDeposit = (b as any).hide_until_deposit || false;
      const isBeforeDeposit = previewMode === 'before';
      
      // For hide_until_deposit blocks, use pre/post deposit fields
      if (hideUntilDeposit) {
        return {
          id: b.id,
          sort_order: b.sort_order,
          type: b.type,
          client_title: isBeforeDeposit 
            ? ((b as any).pre_deposit_title || b.client_title)
            : ((b as any).post_deposit_title || b.client_title),
          description: isBeforeDeposit
            ? ((b as any).pre_deposit_description || null)
            : ((b as any).post_deposit_description || b.description),
          start_offset_minutes: b.start_offset_minutes,
          image_url: isBeforeDeposit ? null : b.image_url,
          visibility: b.visibility,
          venue_name: isBeforeDeposit ? null : b.venue_name,
          neighborhood: isBeforeDeposit ? null : b.neighborhood,
          address: isBeforeDeposit ? null : ((b as any).address || null),
          hide_until_deposit: true,
          lat: null,
          lng: null,
        };
      }
      
      // For blocks using old visibility system
      return {
        id: b.id,
        sort_order: b.sort_order,
        type: b.type,
        client_title: b.client_title,
        description: isBeforeDeposit && b.visibility === 'secret' 
          ? null 
          : (isBeforeDeposit && b.visibility === 'reveal' && (b as any).teaser_description
            ? (b as any).teaser_description
            : b.description),
        start_offset_minutes: b.start_offset_minutes,
        image_url: isBeforeDeposit && ['secret', 'reveal'].includes(b.visibility) ? null : b.image_url,
        visibility: b.visibility,
        venue_name: isBeforeDeposit && ['secret', 'reveal'].includes(b.visibility) ? null : (b.visibility === 'vague' ? null : b.venue_name),
        neighborhood: isBeforeDeposit && ['secret', 'reveal'].includes(b.visibility) ? null : b.neighborhood,
        address: isBeforeDeposit ? null : ((b as any).address || null),
        lat: null,
        lng: null,
      };
    }),
  };

  if (previewMode) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-sand-50 py-4 mb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setPreviewMode(null)}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to Editor
            </Button>
            <div className="flex gap-2">
              <Button
                variant={previewMode === 'before' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('before')}
              >
                Before Confirmation
              </Button>
              <Button
                variant={previewMode === 'after' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('after')}
              >
                After Confirmation
              </Button>
            </div>
          </div>
        </div>
        <ProposalRenderer proposal={previewProposal} isPreview />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/app/tours')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="font-display text-2xl font-bold text-sand-900">
            {isNew ? 'New Tour Template' : 'Edit Tour'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode('before')}
            icon={<Eye className="h-4 w-4" />}
          >
            Preview
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            icon={<Save className="h-4 w-4" />}
          >
            Save
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Tour Details */}
        <Card variant="elevated" padding="lg">
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-6">
            Tour Details
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Tour Name"
                placeholder="e.g., Hidden Gems of Rome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Input
              label="City"
              placeholder="e.g., Rome"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <div className="sm:col-span-2">
              <div className="p-4 rounded-xl bg-sand-50 border border-sand-200">
                <div className="text-sm font-medium text-sand-900 mb-1">
                  Tour Duration
                </div>
                <div className="text-lg font-semibold text-sand-700">
                  {Math.floor(totalDurationMinutes / 60)}h {totalDurationMinutes % 60}m
                </div>
                <div className="text-xs text-sand-500 mt-1">
                  Calculated from itinerary blocks
                </div>
              </div>
            </div>
            <Select
              label="Price Mode"
              value={priceMode}
              onChange={(e) => setPriceMode(e.target.value as PriceMode)}
              options={PRICE_MODES}
            />
            <Input
              label={`Base Price (${currency})`}
              type="number"
              min={0}
              step={1}
              value={basePrice}
              onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
              hint={formatPrice(basePrice, currency)}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                placeholder="Describe your tour..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="sm:col-span-2">
              <ImageUpload
                label="Cover Image"
                value={coverImageUrl}
                onChange={(url) => setCoverImageUrl(url || '')}
                folder="tours"
                hint="Upload a cover image for your tour (or enter a URL)"
              />
            </div>
          </div>

          {/* Time-Bound Scheduling */}
          <div className="mt-6 pt-6 border-t border-sand-200">
            <div className="p-4 rounded-xl bg-primary-50 border border-primary-200 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTimeBound}
                  onChange={(e) => setIsTimeBound(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-sand-300 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-primary-900 mb-1">
                    This tour is time-bound
                  </div>
                  <div className="text-xs text-primary-700">
                    Enable if this tour can only be scheduled on specific days or times (e.g., every Sunday at 7pm, only Wednesdays)
                  </div>
                </div>
              </label>
            </div>

            {isTimeBound && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sand-700 mb-2">
                    Allowed Days of Week
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 0, label: 'Sun' },
                      { value: 1, label: 'Mon' },
                      { value: 2, label: 'Tue' },
                      { value: 3, label: 'Wed' },
                      { value: 4, label: 'Thu' },
                      { value: 5, label: 'Fri' },
                      { value: 6, label: 'Sat' },
                    ].map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          if (allowedDaysOfWeek.includes(day.value)) {
                            setAllowedDaysOfWeek(allowedDaysOfWeek.filter(d => d !== day.value));
                          } else {
                            setAllowedDaysOfWeek([...allowedDaysOfWeek, day.value]);
                          }
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                          ${allowedDaysOfWeek.includes(day.value)
                            ? 'bg-primary-600 text-white'
                            : 'bg-white border-2 border-sand-200 text-sand-700 hover:border-primary-400'
                          }
                        `}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-sand-500 mt-1">
                    Select days when this tour can be scheduled. Leave empty to allow any day.
                  </div>
                </div>

                <JollyTimeField
                  value={preferredStartTime}
                  onChange={setPreferredStartTime}
                  label="Preferred Start Time (optional)"
                  description="Preferred start time for this tour (e.g., 7:00 PM)"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Itinerary Blocks */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-sand-900">
              Itinerary Blocks
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={addBlock}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Block
            </Button>
          </div>

          {activeBlocks.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeBlocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {activeBlocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      expanded={expandedBlock === block.id}
                      onToggle={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}
                      onUpdate={(updates) => updateBlock(block.id, updates)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-sand-500">
              <p className="mb-4">No blocks yet. Add your first itinerary block.</p>
              <Button
                variant="outline"
                onClick={addBlock}
                icon={<Plus className="h-4 w-4" />}
              >
                Add Block
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Block Create Modal */}
      <BlockCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleBlockCreated}
        sortOrder={localBlocks.length}
        previousBlockEndTime={getPreviousBlockEndTime()}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="Free plans are limited to 1 tour template. Upgrade to Pro for unlimited templates."
      />
    </div>
  );
}

