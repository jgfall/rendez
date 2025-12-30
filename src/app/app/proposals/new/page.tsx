'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, MessageCircle, Check, Link as LinkIcon, Edit2, ChevronDown, ChevronUp, AlertCircle, CreditCard } from 'lucide-react';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Textarea, Select, Card, Badge, CalendarWithTimePresets } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import type { TourTemplate, TourBlock, BlockType, BlockVisibility } from '@/types/database';

export default function NewProposalPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [tours, setTours] = useState<TourTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedTourId, setSelectedTourId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [groupSize, setGroupSize] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [depositPercentage, setDepositPercentage] = useState(50);
  
  // Block customization state
  const [tourBlocks, setTourBlocks] = useState<TourBlock[]>([]);
  const [customizedBlocks, setCustomizedBlocks] = useState<any[]>([]);
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  // Calendar constraints and conflicts
  const [conflictDates, setConflictDates] = useState<Date[]>([]);

  // Created proposal state
  const [createdProposal, setCreatedProposal] = useState<{
    slug: string;
    id: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Payment status
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);

  useEffect(() => {
    const fetchTours = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile for currency and deposit percentage
      const { data: profile } = await supabase
        .from('profiles')
        .select('currency, deposit_percentage, payment_link_url')
        .eq('id', user.id)
        .single();
      
      if (profile?.currency) {
        setCurrency(profile.currency);
      }
      
      if (profile?.deposit_percentage !== undefined) {
        setDepositPercentage(profile.deposit_percentage);
      }

      // Check if payment link is set (for showing payment options)
      setPaymentsEnabled(!!profile?.payment_link_url);

      const { data } = await supabase
        .from('tour_templates')
        .select('*')
        .eq('guide_id', user.id)
        .order('name');

      setTours(data || []);
      setLoading(false);
    };

    fetchTours();
  }, [supabase]);

  const selectedTour = tours.find(t => t.id === selectedTourId);
  
  // Fetch existing proposals to find conflicts
  useEffect(() => {
    const fetchConflicts = async () => {
      if (!selectedTourId) {
        setConflictDates([]);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all proposals with scheduled dates for this guide
      const { data: proposals } = await supabase
        .from('proposals')
        .select('scheduled_at')
        .eq('guide_id', user.id)
        .not('scheduled_at', 'is', null);

      if (proposals) {
        const conflicts = proposals
          .map(p => p.scheduled_at ? new Date(p.scheduled_at) : null)
          .filter((d): d is Date => d !== null);
        setConflictDates(conflicts);
      }
    };

    fetchConflicts();
  }, [selectedTourId, supabase]);
  
  // Helper function to update scheduledAt from date and time
  const updateScheduledAt = (date: Date | undefined, time: string | null) => {
    if (date && time) {
      const [hours, minutes] = time.split(':');
      const dateTime = new Date(date);
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      // Format as datetime-local string (YYYY-MM-DDTHH:mm)
      const year = dateTime.getFullYear();
      const month = String(dateTime.getMonth() + 1).padStart(2, '0');
      const day = String(dateTime.getDate()).padStart(2, '0');
      const hour = String(dateTime.getHours()).padStart(2, '0');
      const min = String(dateTime.getMinutes()).padStart(2, '0');
      setScheduledAt(`${year}-${month}-${day}T${hour}:${min}`);
    } else {
      setScheduledAt('');
    }
  };
  
  // Fetch blocks when tour is selected
  useEffect(() => {
    const fetchBlocks = async () => {
      if (!selectedTourId) {
        setTourBlocks([]);
        setCustomizedBlocks([]);
        return;
      }

      const { data } = await supabase
        .from('tour_blocks')
        .select('*')
        .eq('tour_id', selectedTourId)
        .order('sort_order', { ascending: true });

      if (data) {
        setTourBlocks(data);
        // Initialize customized blocks with tour blocks
        setCustomizedBlocks(data.map(b => ({ ...b })));
      }
    };

    fetchBlocks();
  }, [selectedTourId, supabase]);

  // Auto-calculate pricing when tour or group size changes
  useEffect(() => {
    if (selectedTour?.base_price_cents) {
      let calculatedTotal = selectedTour.base_price_cents / 100; // Convert cents to whole number
      
      if (selectedTour.price_mode === 'per_person' && groupSize) {
        const people = parseInt(groupSize);
        if (!isNaN(people) && people > 0) {
          calculatedTotal = calculatedTotal * people;
        }
      }
      
      // Auto-populate the total price field
      setTotalPrice(String(calculatedTotal));
    } else if (!selectedTourId) {
      // Clear pricing when no tour is selected
      setTotalPrice('');
      setDeposit('');
    }
  }, [selectedTour, groupSize, selectedTourId]);

  // Auto-calculate deposit when total price or deposit percentage changes
  useEffect(() => {
    if (totalPrice && depositPercentage) {
      const calculatedDeposit = (parseFloat(totalPrice) * depositPercentage) / 100;
      // Round to 2 decimal places for display
      setDeposit(String(Math.round(calculatedDeposit * 100) / 100));
    } else if (!totalPrice) {
      // Clear deposit when total price is cleared
      setDeposit('');
    }
  }, [totalPrice, depositPercentage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!selectedTourId) throw new Error('Please select a tour');
      if (!clientName.trim()) throw new Error('Please enter client name');
      if (!deposit) throw new Error('Please enter deposit amount');

      // Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          guide_id: user.id,
          name: clientName.trim(),
          email: clientEmail.trim() || null,
          phone: clientPhone.trim() || null,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Generate unique slug
      const slug = nanoid(10);

      // Create proposal (convert whole numbers to cents for storage)
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          guide_id: user.id,
          tour_id: selectedTourId,
          client_id: client.id,
          slug,
          status: 'draft',
          scheduled_at: scheduledAt || null,
          group_size: groupSize ? parseInt(groupSize) : null,
          total_price_cents: totalPrice ? Math.round(parseFloat(totalPrice) * 100) : null,
          deposit_cents: Math.round(parseFloat(deposit) * 100),
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // If blocks were customized, save them to proposal_blocks
      const blocksChanged = JSON.stringify(customizedBlocks.map(b => ({ 
        sort_order: b.sort_order, 
        type: b.type, 
        client_title: b.client_title 
      }))) !== JSON.stringify(tourBlocks.map(b => ({ 
        sort_order: b.sort_order, 
        type: b.type, 
        client_title: b.client_title 
      })));

      if (blocksChanged && customizedBlocks.length > 0) {
        const { error: blocksError } = await supabase
          .from('proposal_blocks')
          .insert(customizedBlocks.map((b, index) => ({
            proposal_id: proposal.id,
            guide_id: user.id,
            sort_order: index,
            type: b.type,
            client_title: b.client_title,
            description: b.description,
            teaser_description: (b as any).teaser_description || null,
            start_offset_minutes: b.start_offset_minutes,
            image_url: b.image_url,
            visibility: b.visibility,
            venue_name: b.venue_name,
            neighborhood: b.neighborhood,
          })));

        if (blocksError) throw blocksError;
      }

      setCreatedProposal({
        slug: proposal.slug,
        id: proposal.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setSaving(false);
    }
  };

  const proposalUrl = createdProposal 
    ? `${window.location.origin}/p/${createdProposal.slug}`
    : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(proposalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);

    // Update status to sent
    if (createdProposal) {
      await supabase
        .from('proposals')
        .update({ status: 'sent' })
        .eq('id', createdProposal.id);
    }
  };

  const copyWhatsApp = async () => {
    const message = `Hi ${clientName}! 👋\n\nI've prepared a personalized tour proposal for you: ${selectedTour?.name}\n\nView your proposal here:\n${proposalUrl}\n\nLet me know if you have any questions!`;
    await navigator.clipboard.writeText(message);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);

    // Update status to sent
    if (createdProposal) {
      await supabase
        .from('proposals')
        .update({ status: 'sent' })
        .eq('id', createdProposal.id);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (createdProposal) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-100 mb-4">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="font-display text-3xl font-bold text-sand-900 mb-2">
            Proposal Created!
          </h1>
          <p className="text-sand-600">
            Share the link with {clientName} to get started
          </p>
        </div>

        <Card variant="elevated" padding="lg" className="mb-6">
          <label className="block text-sm font-medium text-sand-700 mb-2">
            Proposal Link
          </label>
          <div className="flex gap-2">
            <Input
              value={proposalUrl}
              readOnly
              className="flex-1 font-mono text-sm"
            />
            <Button
              onClick={copyLink}
              variant={copiedLink ? 'secondary' : 'outline'}
              icon={copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            >
              {copiedLink ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </Card>

        <Card variant="elevated" padding="lg" className="mb-6">
          <h3 className="font-medium text-sand-900 mb-4">Quick Share</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={copyLink}
              icon={<LinkIcon className="h-4 w-4" />}
              className="justify-start"
            >
              Copy link
            </Button>
            <Button
              variant="outline"
              onClick={copyWhatsApp}
              icon={<MessageCircle className="h-4 w-4" />}
              className="justify-start"
            >
              {copiedWhatsApp ? 'Message copied!' : 'Copy WhatsApp message'}
            </Button>
          </div>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/app/proposals')}
          >
            View all proposals
          </Button>
          <Button
            onClick={() => {
              setCreatedProposal(null);
              setClientName('');
              setClientEmail('');
              setClientPhone('');
              setScheduledAt('');
              setGroupSize('');
              setTotalPrice('');
              setDeposit('');
            }}
          >
            Create another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/app/proposals')}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <h1 className="font-display text-2xl font-bold text-sand-900">
          New Proposal
        </h1>
      </div>

      {tours.length === 0 ? (
        <Card variant="outlined" padding="lg" className="text-center">
          <p className="text-sand-600 mb-4">
            You need to create a tour template first before creating proposals.
          </p>
          <Button onClick={() => router.push('/app/tours/new')}>
            Create Tour Template
          </Button>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tour Selection */}
          <Card variant="elevated" padding="lg">
            <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
              Select Tour
            </h2>
            <Select
              label="Tour Template"
              value={selectedTourId}
              onChange={(e) => setSelectedTourId(e.target.value)}
              options={[
                { value: '', label: 'Select a tour...' },
                ...tours.map(t => ({ 
                  value: t.id, 
                  label: `${t.name}${t.city ? ` (${t.city})` : ''}` 
                })),
              ]}
            />
            {selectedTour && (
              <div className="mt-4 p-3 rounded-xl bg-sand-50 text-sm text-sand-600">
                Base price: {formatPrice(selectedTour.base_price_cents / 100, currency)}
                {selectedTour.price_mode === 'per_person' && ' per person'}
              </div>
            )}
          </Card>

          {/* Itinerary Customization */}
          {selectedTourId && customizedBlocks.length > 0 && (
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-sand-900">
                  Customize Itinerary
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBlockEditor(!showBlockEditor)}
                  icon={showBlockEditor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                >
                  {showBlockEditor ? 'Hide Editor' : 'Edit Blocks'}
                </Button>
              </div>
              
              {!showBlockEditor ? (
                <div className="space-y-2">
                  {customizedBlocks.map((block, index) => (
                    <div key={block.id || index} className="flex items-center gap-2 p-2 rounded-lg bg-sand-50">
                      <span className="text-sm font-medium text-sand-600 w-8">{index + 1}.</span>
                      <span className="text-sm text-sand-900 flex-1">{block.client_title}</span>
                      <Badge variant="default" size="sm">{block.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {customizedBlocks.map((block, index) => (
                    <div key={block.id || index} className="border rounded-xl p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-sand-600">#{index + 1}</span>
                          <Input
                            value={block.client_title}
                            onChange={(e) => {
                              const updated = [...customizedBlocks];
                              updated[index].client_title = e.target.value;
                              setCustomizedBlocks(updated);
                            }}
                            className="flex-1"
                            placeholder="Block title"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = customizedBlocks.filter((_, i) => i !== index);
                            setCustomizedBlocks(updated);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Select
                          label="Type"
                          value={block.type}
                          onChange={(e) => {
                            const updated = [...customizedBlocks];
                            updated[index].type = e.target.value as BlockType;
                            setCustomizedBlocks(updated);
                          }}
                          options={[
                            { value: 'activity', label: 'Activity' },
                            { value: 'transport', label: 'Transport' },
                            { value: 'meal', label: 'Meal' },
                            { value: 'free_time', label: 'Free Time' },
                            { value: 'accommodation', label: 'Accommodation' },
                            { value: 'other', label: 'Other' },
                          ]}
                        />
                        <Input
                          label="Start Time (minutes)"
                          type="number"
                          value={block.start_offset_minutes}
                          onChange={(e) => {
                            const updated = [...customizedBlocks];
                            updated[index].start_offset_minutes = parseInt(e.target.value) || 0;
                            setCustomizedBlocks(updated);
                          }}
                        />
                      </div>
                      {expandedBlockId === (block.id || index.toString()) ? (
                        <div className="mt-3 space-y-3">
                          <Textarea
                            label="Description"
                            value={block.description || ''}
                            onChange={(e) => {
                              const updated = [...customizedBlocks];
                              updated[index].description = e.target.value || null;
                              setCustomizedBlocks(updated);
                            }}
                            rows={3}
                          />
                          {block.visibility === 'reveal' && (
                            <Textarea
                              label="Teaser Description (shown before deposit)"
                              value={(block as any).teaser_description || ''}
                              onChange={(e) => {
                                const updated = [...customizedBlocks];
                                (updated[index] as any).teaser_description = e.target.value || null;
                                setCustomizedBlocks(updated);
                              }}
                              rows={2}
                              hint="This is what clients see before paying the deposit"
                            />
                          )}
                          <Select
                            label="Visibility"
                            value={block.visibility}
                            onChange={(e) => {
                              const updated = [...customizedBlocks];
                              updated[index].visibility = e.target.value as BlockVisibility;
                              setCustomizedBlocks(updated);
                            }}
                            options={[
                              { value: 'public', label: 'Public - Always visible' },
                              { value: 'vague', label: 'Vague - Hide exact venue name' },
                              { value: 'secret', label: 'Secret - Hidden until confirmed' },
                              { value: 'reveal', label: 'Reveal - Teaser shown, details after payment' },
                            ]}
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              label="Venue Name"
                              value={block.venue_name || ''}
                              onChange={(e) => {
                                const updated = [...customizedBlocks];
                                updated[index].venue_name = e.target.value || null;
                                setCustomizedBlocks(updated);
                              }}
                            />
                            <Input
                              label="Neighborhood"
                              value={block.neighborhood || ''}
                              onChange={(e) => {
                                const updated = [...customizedBlocks];
                                updated[index].neighborhood = e.target.value || null;
                                setCustomizedBlocks(updated);
                              }}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedBlockId(null)}
                          >
                            Collapse
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={() => setExpandedBlockId(block.id || index.toString())}
                        >
                          Show Details
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newBlock: any = {
                        id: `new-${Date.now()}`,
                        sort_order: customizedBlocks.length,
                        type: 'activity',
                        client_title: 'New Stop',
                        description: null,
                        teaser_description: null,
                        start_offset_minutes: 0,
                        image_url: null,
                        visibility: 'reveal',
                        venue_name: null,
                        neighborhood: null,
                      };
                      setCustomizedBlocks([...customizedBlocks, newBlock]);
                    }}
                  >
                    Add New Stop
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Client Info */}
          <Card variant="elevated" padding="lg">
            <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
              Client Information
            </h2>
            <div className="space-y-4">
              <Input
                label="Client Name"
                placeholder="John Doe"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email (optional)"
                  type="email"
                  placeholder="john@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
                <Input
                  label="Phone (optional)"
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Tour Details */}
          <Card variant="elevated" padding="lg">
            <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
              Tour Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sand-700 mb-3">
                  Scheduled Date & Time (optional)
                </label>
                <p className="text-xs text-sand-500 mb-4">
                  Leave blank to let the client choose from your availability calendar
                </p>
                <CalendarWithTimePresets
                  date={scheduledDate}
                  selectedTime={scheduledTime}
                  onDateChange={(date) => {
                    setScheduledDate(date);
                    updateScheduledAt(date, scheduledTime);
                  }}
                  onTimeChange={(time) => {
                    setScheduledTime(time);
                    updateScheduledAt(scheduledDate, time);
                  }}
                  onConfirm={() => {
                    updateScheduledAt(scheduledDate, scheduledTime);
                  }}
                  allowedDaysOfWeek={selectedTour?.is_time_bound ? selectedTour.allowed_days_of_week : null}
                  conflictDates={conflictDates}
                  preferredStartTime={selectedTour?.is_time_bound ? selectedTour.preferred_start_time : null}
                />
              </div>
              <Input
                label="Group Size (optional)"
                type="number"
                min={1}
                placeholder="2"
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
              />
            </div>
          </Card>

          {/* Pricing */}
          <Card variant="elevated" padding="lg">
            <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">
              Pricing ({currency})
            </h2>
            {!paymentsEnabled && (
              <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 mb-1">
                      Payment Link Not Set
                    </p>
                    <p className="text-sm text-amber-700 mb-3">
                      Set a payment link in your profile settings. Clients will use this to pay deposits.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/app/profile')}
                      icon={<CreditCard className="h-4 w-4" />}
                    >
                      Set Payment Link
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {paymentsEnabled && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                <p className="font-medium">✓ Payment link configured</p>
                <p className="text-xs mt-1">Clients can pay deposits using your payment link.</p>
              </div>
            )}
            {selectedTour?.base_price_cents && (
              <div className="mb-4 p-3 rounded-xl bg-primary-50 border border-primary-200 text-sm text-primary-700">
                <p className="font-medium mb-1">Auto-calculated from tour template</p>
                <p>
                  Base: {formatPrice(selectedTour.base_price_cents / 100, currency)}
                  {selectedTour.price_mode === 'per_person' && ' per person'}
                  {groupSize && selectedTour.price_mode === 'per_person' && ` × ${groupSize} people`}
                  {selectedTour.price_mode === 'per_person' && groupSize && ` = ${formatPrice((selectedTour.base_price_cents / 100) * parseInt(groupSize || '1'), currency)}`}
                </p>
                <p className="mt-1 text-xs text-primary-600">
                  Deposit: {depositPercentage}% of total
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={`Total Price (${currency}, optional)`}
                  type="number"
                  min={0}
                  step={1}
                  placeholder="250"
                  value={totalPrice}
                  onChange={(e) => {
                    setTotalPrice(e.target.value);
                    // Recalculate deposit when total price changes manually
                    if (e.target.value) {
                      const newTotal = parseFloat(e.target.value);
                      if (!isNaN(newTotal) && newTotal > 0) {
                        const newDeposit = Math.round(newTotal * (depositPercentage / 100));
                        setDeposit(String(newDeposit));
                      }
                    }
                  }}
                  hint={totalPrice ? formatPrice(parseFloat(totalPrice) || 0, currency) : 'Leave blank to show only deposit'}
                />
                <Input
                  label={`Deposit (${currency})`}
                  type="number"
                  min={1}
                  step={1}
                  placeholder="75"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  hint={deposit ? formatPrice(parseFloat(deposit) || 0, currency) : 'Required to confirm'}
                  required
                />
              </div>
            </div>
          </Card>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/app/proposals')}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create Proposal
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

