'use client';

import { useState, useEffect } from 'react';
import { MapPin, Eye, ArrowRight, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { Modal, Button, Input, Textarea, Select, Badge, ImageUpload, PlaceSearch } from '@/components/ui';
import type { PlaceResult } from '@/components/ui';
import type { BlockType, BlockVisibility } from '@/types/database';

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: 'activity', label: 'Activity' },
  { value: 'transport', label: 'Transport' },
  { value: 'meal', label: 'Meal' },
  { value: 'free_time', label: 'Free Time' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'other', label: 'Other' },
];

interface BlockCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: any) => void;
  sortOrder: number;
  previousBlockEndTime?: number;
}

type Step = 1 | 2 | 3;

export function BlockCreateModal({ isOpen, onClose, onSave, sortOrder, previousBlockEndTime = 0 }: BlockCreateModalProps) {
  const [step, setStep] = useState<Step>(1);
  
  // Step 1: Place search
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [blockType, setBlockType] = useState<BlockType>('activity');
  
  // Step 2: Hide until deposit
  const [hideUntilDeposit, setHideUntilDeposit] = useState(false);
  const [preDepositTitle, setPreDepositTitle] = useState('');
  const [preDepositDescription, setPreDepositDescription] = useState('');
  const [postDepositTitle, setPostDepositTitle] = useState('');
  const [postDepositDescription, setPostDepositDescription] = useState('');
  
  // Step 3: Logistics
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Auto-fill data when place is selected
  useEffect(() => {
    if (selectedPlace) {
      // Auto-fill venue name
      if (selectedPlace.name && !venueName) {
        setVenueName(selectedPlace.name);
      }
      
      // Auto-fill address
      if (selectedPlace.address && !address) {
        setAddress(selectedPlace.address);
      }
      
      // Try to extract neighborhood from address (simple heuristic)
      if (selectedPlace.address && !neighborhood) {
        // Try to extract neighborhood - look for common patterns
        const addressParts = selectedPlace.address.split(',');
        if (addressParts.length >= 2) {
          // Usually neighborhood is the second-to-last part
          const potentialNeighborhood = addressParts[addressParts.length - 2]?.trim();
          if (potentialNeighborhood) {
            setNeighborhood(potentialNeighborhood);
          }
        }
      }
      
      // Auto-fill photo from Google Maps
      if (selectedPlace.photoUrl && !imageUrl) {
        setImageUrl(selectedPlace.photoUrl);
      }
      
      // Auto-suggest block type based on place types
      if (selectedPlace.types) {
        const types = selectedPlace.types;
        if (types.some(t => t.includes('restaurant') || t.includes('food'))) {
          setBlockType('meal');
        } else if (types.some(t => t.includes('lodging') || t.includes('hotel'))) {
          setBlockType('accommodation');
        } else if (types.some(t => t.includes('transit') || t.includes('station'))) {
          setBlockType('transport');
        }
      }
      
      // Auto-fill post-deposit title if not set
      if (selectedPlace.name && !postDepositTitle) {
        setPostDepositTitle(selectedPlace.name);
      }
    }
  }, [selectedPlace, venueName, address, neighborhood, imageUrl, postDepositTitle]);

  const handlePlaceSelect = (place: PlaceResult) => {
    setSelectedPlace(place);
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate step 1: need at least a venue name or selected place
      if (!selectedPlace && !venueName.trim()) {
        alert('Please search and select a place or enter a venue name');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Step 2 validation
      if (hideUntilDeposit) {
        if (!preDepositTitle.trim() || !postDepositTitle.trim()) {
          alert('Please enter both pre-deposit and post-deposit titles');
          return;
        }
      } else {
        if (!postDepositTitle.trim()) {
          alert('Please enter a title for this block');
          return;
        }
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSave = () => {
    // Calculate duration in minutes
    const totalDurationMinutes = durationHours * 60 + durationMinutes;
    const startOffsetMinutes = previousBlockEndTime;

    const block = {
      id: crypto.randomUUID(),
      sort_order: sortOrder,
      type: blockType,
      client_title: hideUntilDeposit ? postDepositTitle : postDepositTitle,
      description: hideUntilDeposit ? postDepositDescription : description,
      teaser_description: null,
      start_offset_minutes: startOffsetMinutes,
      duration_minutes: totalDurationMinutes,
      image_url: imageUrl || null,
      visibility: 'public' as BlockVisibility,
      venue_name: venueName || selectedPlace?.name || null,
      neighborhood: neighborhood || null,
      address: address || selectedPlace?.address || null,
      lat: selectedPlace?.lat || null,
      lng: selectedPlace?.lng || null,
      hide_until_deposit: hideUntilDeposit,
      pre_deposit_title: hideUntilDeposit ? preDepositTitle : null,
      pre_deposit_description: hideUntilDeposit ? preDepositDescription : null,
      post_deposit_title: hideUntilDeposit ? postDepositTitle : null,
      post_deposit_description: hideUntilDeposit ? postDepositDescription : null,
      _isNew: true,
    };

    onSave(block);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStep(1);
    setSelectedPlace(null);
    setVenueName('');
    setAddress('');
    setNeighborhood('');
    setBlockType('activity');
    setDescription('');
    setImageUrl('');
    setDurationHours(1);
    setDurationMinutes(0);
    setHideUntilDeposit(false);
    setPreDepositTitle('');
    setPreDepositDescription('');
    setPostDepositTitle('');
    setPostDepositDescription('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Tour Block"
      size="lg"
    >
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary-600' : 'text-sand-400'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
            step >= 1 ? 'border-primary-600 bg-primary-50' : 'border-sand-300'
          }`}>
            {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : '1'}
          </div>
          <span className="text-sm font-medium hidden sm:inline">Place</span>
        </div>
        <ArrowRight className="h-4 w-4 text-sand-400" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary-600' : 'text-sand-400'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
            step >= 2 ? 'border-primary-600 bg-primary-50' : 'border-sand-300'
          }`}>
            {step > 2 ? <CheckCircle2 className="h-5 w-5" /> : '2'}
          </div>
          <span className="text-sm font-medium hidden sm:inline">Visibility</span>
        </div>
        <ArrowRight className="h-4 w-4 text-sand-400" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary-600' : 'text-sand-400'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
            step >= 3 ? 'border-primary-600 bg-primary-50' : 'border-sand-300'
          }`}>
            3
          </div>
          <span className="text-sm font-medium hidden sm:inline">Details</span>
        </div>
      </div>

      {/* Step 1: Place Search */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-sand-900 mb-1">
              Search for a place
            </h3>
            <p className="text-sm text-sand-600">
              We'll automatically pull information like name, address, and location from Google Maps.
            </p>
          </div>

          <PlaceSearch
            value={selectedPlace}
            onChange={setSelectedPlace}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search for a place (e.g., restaurant, venue, location)..."
            label="Search Place"
            hint="Start typing to search for a place"
          />

          {/* Auto-filled information preview */}
          {selectedPlace && (
            <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 space-y-3">
              {/* Show photo preview if available */}
              {imageUrl && (
                <div className="mb-3">
                  <img
                    src={imageUrl}
                    alt={venueName || selectedPlace.name}
                    className="w-full h-32 rounded-lg object-cover border border-sand-200"
                  />
                </div>
              )}
              
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Venue Name"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  hint="Can be edited"
                />
                <Select
                  label="Block Type"
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value as BlockType)}
                  options={BLOCK_TYPES}
                />
              </div>

              <Input
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                hint="Full address (shown after deposit)"
              />

              <Input
                label="Neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                hint="Area/neighborhood (shown before deposit if not hidden)"
              />
            </div>
          )}

          {/* Manual entry option */}
          {!selectedPlace && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-sand-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-sand-500">Or enter manually</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Venue Name"
                  placeholder="e.g., Mezzrow Jazz Club"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  required
                />
                <Select
                  label="Block Type"
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value as BlockType)}
                  options={BLOCK_TYPES}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-sand-200">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleNext} icon={<ArrowRight className="h-4 w-4" />}>
              Next: Visibility
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Hide Until Deposit */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-sand-900 mb-1">
              Visibility Settings
            </h3>
            <p className="text-sm text-sand-600">
              Choose whether to hide details until the deposit is paid.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-sand-50 border border-sand-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideUntilDeposit}
                onChange={(e) => setHideUntilDeposit(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-sand-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-sand-900 mb-1">
                  Hide this until deposit paid?
                </div>
                <div className="text-xs text-sand-600">
                  If checked, clients will see a generic title/description before paying. After deposit, they'll see the full details including the actual venue name and address.
                </div>
              </div>
            </label>
          </div>

          {hideUntilDeposit ? (
            <div className="space-y-4 p-4 rounded-xl bg-sand-50 border border-sand-200">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-sand-600" />
                <span className="text-sm font-medium text-sand-900">Before Deposit (What clients see initially)</span>
              </div>
              <Input
                label="Display Title"
                placeholder="e.g., Jazz Club"
                value={preDepositTitle}
                onChange={(e) => setPreDepositTitle(e.target.value)}
                required
                hint="Generic title - no specific venue name"
              />
              <Textarea
                label="Display Description"
                placeholder="Give a hint about what they'll experience..."
                value={preDepositDescription}
                onChange={(e) => setPreDepositDescription(e.target.value)}
                rows={2}
                hint="Teaser description - no specific details"
              />

              <div className="pt-4 border-t border-sand-200">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-medium text-primary-900">After Deposit (Full details revealed)</span>
                </div>
                <Input
                  label="Full Title"
                  placeholder="e.g., Mezzrow Jazz Club"
                  value={postDepositTitle}
                  onChange={(e) => setPostDepositTitle(e.target.value)}
                  required
                  hint="Full venue name shown after deposit"
                />
                <Textarea
                  label="Full Description"
                  placeholder="Full details about this stop..."
                  value={postDepositDescription}
                  onChange={(e) => setPostDepositDescription(e.target.value)}
                  rows={3}
                  hint="Complete information including address (shown after deposit)"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Title"
                placeholder="e.g., Jazz Club Experience"
                value={postDepositTitle}
                onChange={(e) => setPostDepositTitle(e.target.value)}
                required
                hint="Title for this block"
              />
              <Textarea
                label="Description"
                placeholder="Describe this part of the tour..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                hint="Description for this block"
              />
            </div>
          )}

          <div className="flex justify-between gap-3 pt-4 border-t border-sand-200">
            <Button variant="outline" onClick={handleBack} icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            <Button onClick={handleNext} icon={<ArrowRight className="h-4 w-4" />}>
              Next: Details
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Logistics */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-sand-900 mb-1">
              Final Details
            </h3>
            <p className="text-sm text-sand-600">
              Set duration and add any additional information.
            </p>
          </div>

          {/* Duration */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Duration (Hours)"
              type="number"
              min={0}
              max={24}
              value={durationHours}
              onChange={(e) => setDurationHours(parseInt(e.target.value) || 0)}
              hint="Hours"
            />
            <Input
              label="Duration (Minutes)"
              type="number"
              min={0}
              max={59}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              hint="Minutes"
            />
          </div>
          <div className="text-sm text-sand-600">
            Total duration: {durationHours}h {durationMinutes}m
          </div>

          {/* Description (if not using hide until deposit) */}
          {!hideUntilDeposit && (
            <Textarea
              label="Description"
              placeholder="Describe this part of the tour..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          )}

          {/* Image */}
          <ImageUpload
            label="Image (optional)"
            value={imageUrl || undefined}
            onChange={(url) => setImageUrl(url || '')}
            folder="blocks"
            hint="Upload an image for this block"
          />

          <div className="flex justify-between gap-3 pt-4 border-t border-sand-200">
            <Button variant="outline" onClick={handleBack} icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Create Block
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
