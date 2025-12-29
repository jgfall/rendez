'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  Navigation,
  Utensils,
  Coffee,
  Bed,
  CircleDot,
  Eye,
  Info
} from 'lucide-react';
import { Input, Textarea, Select, Button, Badge, BlockVisibilityBadge, ImageUpload, PlaceSearch } from '@/components/ui';
import type { PlaceResult } from '@/components/ui';
import type { LocalBlock } from './tour-editor';
import type { BlockType, BlockVisibility } from '@/types/database';

const BLOCK_TYPES: { value: BlockType; label: string; icon: React.ReactNode }[] = [
  { value: 'activity', label: 'Activity', icon: <MapPin className="h-4 w-4" /> },
  { value: 'transport', label: 'Transport', icon: <Navigation className="h-4 w-4" /> },
  { value: 'meal', label: 'Meal', icon: <Utensils className="h-4 w-4" /> },
  { value: 'free_time', label: 'Free Time', icon: <Coffee className="h-4 w-4" /> },
  { value: 'accommodation', label: 'Accommodation', icon: <Bed className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <CircleDot className="h-4 w-4" /> },
];

interface SortableBlockProps {
  block: LocalBlock;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<LocalBlock>) => void;
  onDelete: () => void;
}

export function SortableBlock({ block, expanded, onToggle, onUpdate, onDelete }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const blockType = BLOCK_TYPES.find(t => t.value === block.type);
  const hideUntilDeposit = (block as any).hide_until_deposit || false;
  
  // Calculate duration hours and minutes
  const durationMinutes = (block as any).duration_minutes || 60;
  const durationHours = Math.floor(durationMinutes / 60);
  const durationMins = durationMinutes % 60;

  // Place result for place search
  const placeResult: PlaceResult | null = block.venue_name ? {
    name: block.venue_name,
    address: (block as any).address || block.neighborhood || undefined,
    lat: block.lat || undefined,
    lng: block.lng || undefined,
  } : null;

  const handlePlaceSelect = (place: PlaceResult) => {
    // Extract neighborhood from address if possible
    let neighborhood = null;
    if (place.address) {
      const addressParts = place.address.split(',');
      if (addressParts.length >= 2) {
        neighborhood = addressParts[addressParts.length - 2]?.trim() || null;
      }
    }
    
    onUpdate({
      venue_name: place.name,
      address: place.address || null,
      neighborhood: neighborhood,
      lat: place.lat || null,
      lng: place.lng || null,
    } as any);
  };

  const handleDurationChange = (hours: number, minutes: number) => {
    const totalMinutes = hours * 60 + minutes;
    onUpdate({ duration_minutes: totalMinutes } as any);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border rounded-xl bg-white overflow-hidden
        ${isDragging ? 'shadow-xl ring-2 ring-primary-500' : 'border-sand-200'}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-sand-50">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-sand-400 hover:text-sand-600"
          suppressHydrationWarning
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-sand-600">
          {blockType?.icon}
          <span className="text-sm font-medium">{blockType?.label}</span>
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-sand-900 truncate block">
            {hideUntilDeposit && (block as any).pre_deposit_title 
              ? (block as any).pre_deposit_title 
              : block.client_title}
          </span>
          {block.venue_name && (
            <span className="text-xs text-sand-500 truncate block">
              {block.venue_name}
            </span>
          )}
        </div>

        <BlockVisibilityBadge visibility={block.visibility} />
        
        {hideUntilDeposit && (
          <Badge variant="primary" size="sm">Hidden until deposit</Badge>
        )}

        <button
          onClick={onToggle}
          className="p-1 text-sand-400 hover:text-sand-600 transition-colors"
        >
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

        <button
          onClick={onDelete}
          className="p-1 text-sand-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-4 space-y-4 border-t border-sand-100">
          {/* Place Search */}
          <PlaceSearch
            value={placeResult}
            onChange={(place) => {
              if (place) {
                handlePlaceSelect(place);
              } else {
                onUpdate({
                  venue_name: null,
                  neighborhood: null,
                  address: null,
                  lat: null,
                  lng: null,
                } as any);
              }
            }}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search for a place..."
            label="Location"
            hint="Search for a place to auto-fill details"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Venue Name"
              placeholder="Actual venue name"
              value={block.venue_name || ''}
              onChange={(e) => onUpdate({ venue_name: e.target.value || null })}
              hint="Internal reference - actual place name"
            />
            <Select
              label="Block Type"
              value={block.type}
              onChange={(e) => onUpdate({ type: e.target.value as BlockType })}
              options={BLOCK_TYPES.map(t => ({ value: t.value, label: t.label }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Neighborhood (optional)"
              placeholder="e.g., Greenwich Village"
              value={block.neighborhood || ''}
              onChange={(e) => onUpdate({ neighborhood: e.target.value || null })}
              hint="Shown before deposit (if not hidden)"
            />
            <Input
              label="Address (optional)"
              placeholder="Full address"
              value={(block as any).address || ''}
              onChange={(e) => onUpdate({ address: e.target.value || null } as any)}
              hint="Shown after deposit is paid"
            />
          </div>

          {/* Hide Until Deposit Checkbox */}
          <div className="p-4 rounded-xl bg-primary-50 border border-primary-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideUntilDeposit}
                onChange={(e) => onUpdate({ hide_until_deposit: e.target.checked } as any)}
                className="mt-1 h-4 w-4 rounded border-sand-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-primary-900 mb-1">
                  Hide this until deposit paid?
                </div>
                <div className="text-xs text-primary-700">
                  Show different content before and after deposit payment
                </div>
              </div>
            </label>
          </div>

          {/* Pre/Post Deposit Fields */}
          {hideUntilDeposit ? (
            <div className="space-y-4 p-4 rounded-xl bg-sand-50 border border-sand-200">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-sand-600" />
                <span className="text-sm font-medium text-sand-900">Before Deposit (What clients see initially)</span>
              </div>
              <Input
                label="Display Title"
                placeholder="e.g., Jazz Club"
                value={(block as any).pre_deposit_title || ''}
                onChange={(e) => onUpdate({ pre_deposit_title: e.target.value || null } as any)}
                hint="Generic title shown before deposit"
              />
              <Textarea
                label="Display Description"
                placeholder="Give a hint about what they'll experience..."
                value={(block as any).pre_deposit_description || ''}
                onChange={(e) => onUpdate({ pre_deposit_description: e.target.value || null } as any)}
                rows={2}
                hint="Teaser description shown before deposit"
              />

              <div className="pt-4 border-t border-sand-200">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-medium text-primary-900">After Deposit (Full details revealed)</span>
                </div>
                <Input
                  label="Full Title"
                  placeholder="e.g., Mezzrow Jazz Club"
                  value={(block as any).post_deposit_title || block.client_title || ''}
                  onChange={(e) => {
                    const title = e.target.value;
                    onUpdate({ 
                      post_deposit_title: title || null,
                      client_title: title, // Also update client_title for backwards compatibility
                    } as any);
                  }}
                  hint="Full title shown after deposit"
                />
                <Textarea
                  label="Full Description"
                  placeholder="Full details about this stop..."
                  value={(block as any).post_deposit_description || block.description || ''}
                  onChange={(e) => {
                    const desc = e.target.value;
                    onUpdate({ 
                      post_deposit_description: desc || null,
                      description: desc, // Also update description for backwards compatibility
                    } as any);
                  }}
                  rows={3}
                  hint="Complete information shown after deposit"
                />
              </div>
            </div>
          ) : (
            <>
              <Input
                label="Client Title"
                placeholder="What the client sees"
                value={block.client_title}
                onChange={(e) => onUpdate({ client_title: e.target.value })}
                required
              />
              <Textarea
                label="Description"
                placeholder="Describe this part of the tour..."
                value={block.description || ''}
                onChange={(e) => onUpdate({ description: e.target.value || null })}
                rows={2}
              />
            </>
          )}

          {/* Duration */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-sand-700 mb-1.5">
                Duration (Hours)
              </label>
              <input
                type="number"
                min={0}
                max={24}
                value={durationHours}
                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0, durationMins)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-sand-200 text-sand-900 focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sand-700 mb-1.5">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={0}
                max={59}
                value={durationMins}
                onChange={(e) => handleDurationChange(durationHours, parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-sand-200 text-sand-900 focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10"
              />
            </div>
          </div>
          <div className="text-sm text-sand-600">
            Total duration: {durationHours}h {durationMins}m
          </div>

          <ImageUpload
            label="Image (optional)"
            value={block.image_url || undefined}
            onChange={(url) => onUpdate({ image_url: url || null })}
            folder="blocks"
            hint="Upload an image for this block (or enter a URL)"
          />
        </div>
      )}
    </div>
  );
}
