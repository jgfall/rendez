'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User, Building2, Upload, Camera, X, ChevronDown, ChevronUp, Plus, CreditCard, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Textarea, Select, Card, ImageUpload, ProfilePhotoUpload } from '@/components/ui';
import type { Profile } from '@/types/database';

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  { value: 'UTC', label: 'UTC' },
];

const currencies = [
  { value: 'USD', label: 'USD - US Dollar ($)' },
  { value: 'EUR', label: 'EUR - Euro (€)' },
  { value: 'GBP', label: 'GBP - British Pound (£)' },
  { value: 'JPY', label: 'JPY - Japanese Yen (¥)' },
  { value: 'AUD', label: 'AUD - Australian Dollar (A$)' },
  { value: 'CAD', label: 'CAD - Canadian Dollar (C$)' },
  { value: 'CHF', label: 'CHF - Swiss Franc (Fr)' },
  { value: 'MXN', label: 'MXN - Mexican Peso ($)' },
  { value: 'BRL', label: 'BRL - Brazilian Real (R$)' },
  { value: 'SGD', label: 'SGD - Singapore Dollar (S$)' },
  { value: 'AED', label: 'AED - UAE Dirham (د.إ)' },
  { value: 'NZD', label: 'NZD - New Zealand Dollar (NZ$)' },
];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Personal info
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [email, setEmail] = useState('');

  // Business info
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [bio, setBio] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [showBusinessBranding, setShowBusinessBranding] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  // Stripe Connect state
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeChargesEnabled, setStripeChargesEnabled] = useState(false);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState(false);
  const [stripeDetailsSubmitted, setStripeDetailsSubmitted] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
        setTimezone(profile.timezone);
        setCurrency(profile.currency);
        setDepositPercentage(profile.deposit_percentage || 50);
        setBusinessName(profile.business_name || '');
        setLogoUrl(profile.logo_url || null);
        setProfilePhotoUrl(profile.profile_photo_url || null);
        setBio(profile.bio || '');
        // Show business branding if any business info exists
        setShowBusinessBranding(
          !!(profile.business_name || profile.logo_url || profile.bio)
        );
        // Stripe Connect status
        setStripeAccountId(profile.stripe_account_id || null);
        setStripeChargesEnabled(profile.stripe_charges_enabled || false);
        setStripePayoutsEnabled(profile.stripe_payouts_enabled || false);
        setStripeDetailsSubmitted(profile.stripe_details_submitted || false);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
    setError(null);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !userId) return logoUrl;

    setUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${userId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) {
        console.error('Logo upload error:', uploadError);
        return logoUrl;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setLogoFile(null);
      return publicUrl;
    } catch (err) {
      console.error('Logo upload error:', err);
      return logoUrl;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload logo if a new file was selected
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        finalLogoUrl = await uploadLogo();
      }

      // Profile photo is already uploaded via ImageUpload component
      // Just use the URL directly (ImageUpload handles upload automatically)
      let finalProfilePhotoUrl = profilePhotoUrl;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          timezone,
          currency,
          deposit_percentage: depositPercentage,
          business_name: businessName.trim() || null,
          logo_url: finalLogoUrl,
          profile_photo_url: finalProfilePhotoUrl,
          bio: bio.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    setError(null);

    try {
      // Step 1: Create or get Stripe account
      const createAccountRes = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
      });

      if (!createAccountRes.ok) {
        const errorData = await createAccountRes.json();
        throw new Error(errorData.error || 'Failed to create Stripe account');
      }

      const { stripe_account_id } = await createAccountRes.json();

      // Step 2: Create account link for onboarding
      const returnUrl = `${window.location.origin}/app/profile?stripe_return=true`;
      const refreshUrl = `${window.location.origin}/app/profile?stripe_refresh=true`;

      const createLinkRes = await fetch('/api/stripe/connect/create-account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: returnUrl, refresh_url: refreshUrl }),
      });

      if (!createLinkRes.ok) {
        const errorData = await createLinkRes.json();
        throw new Error(errorData.error || 'Failed to create account link');
      }

      const { url } = await createLinkRes.json();

      // Redirect to Stripe onboarding
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Stripe');
      setConnectingStripe(false);
    }
  };

  const handleManageStripe = async () => {
    if (!stripeAccountId) return;

    setConnectingStripe(true);
    setError(null);

    try {
      // Create account link for dashboard access
      const returnUrl = `${window.location.origin}/app/profile?stripe_return=true`;
      const refreshUrl = `${window.location.origin}/app/profile?stripe_refresh=true`;

      const createLinkRes = await fetch('/api/stripe/connect/create-account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: returnUrl, refresh_url: refreshUrl }),
      });

      if (!createLinkRes.ok) {
        const errorData = await createLinkRes.json();
        throw new Error(errorData.error || 'Failed to create account link');
      }

      const { url } = await createLinkRes.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open Stripe dashboard');
      setConnectingStripe(false);
    }
  };

  // Check for Stripe return/refresh params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_return') || params.get('stripe_refresh')) {
      // Refresh profile data to get updated Stripe status
      const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted')
          .eq('id', user.id)
          .single();

        if (profile) {
          setStripeAccountId(profile.stripe_account_id || null);
          setStripeChargesEnabled(profile.stripe_charges_enabled || false);
          setStripePayoutsEnabled(profile.stripe_payouts_enabled || false);
          setStripeDetailsSubmitted(profile.stripe_details_submitted || false);
        }

        // Clean up URL
        window.history.replaceState({}, '', '/app/profile');
      };

      fetchProfile();
    }
  }, [supabase]);

  const paymentsEnabled = stripeAccountId && stripeChargesEnabled;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-light text-sand-900">Profile & Business</h1>
        <p className="mt-1 text-sand-600">Manage your account and business branding</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info Card */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-light text-sand-900">
                Personal Information
              </h2>
              <p className="text-sm text-sand-500">Your account details</p>
            </div>
          </div>

          <div className="space-y-5">
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              label="Email"
              type="email"
              value={email}
              disabled
              hint="Contact support to change your email"
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={timezones}
              />

              <Select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={currencies}
              />
            </div>

            <Input
              label="Default Deposit Percentage"
              type="number"
              min={0}
              max={100}
              value={depositPercentage}
              onChange={(e) => setDepositPercentage(parseInt(e.target.value) || 50)}
              hint={`Used to automatically calculate deposits when creating proposals (${depositPercentage}%)`}
            />

            {/* Profile Photo upload */}
            <ProfilePhotoUpload
              label="Profile Photo"
              value={profilePhotoUrl || undefined}
              onChange={(url) => {
                setProfilePhotoUrl(url);
                // If it's a new upload (starts with our storage URL), we'll handle it in handleSubmit
                if (url && url.includes('/storage/v1/object/public/tour-images/')) {
                  // This is a new upload, we'll save it directly
                  setProfilePhotoFile(null); // Clear file since it's already uploaded
                } else if (!url) {
                  setProfilePhotoFile(null);
                }
              }}
              hint="Your profile photo will appear in proposals (or enter a URL)"
            />
          </div>
        </Card>

        {/* Business Branding Card */}
        <Card variant="elevated" padding="lg">
          <button
            type="button"
            onClick={() => setShowBusinessBranding(!showBusinessBranding)}
            className="w-full flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div className="text-left">
                <h2 className="font-display text-xl font-light text-sand-900">
                  Business Branding
                </h2>
                <p className="text-sm text-sand-500">
                  {showBusinessBranding 
                    ? 'How you appear to clients' 
                    : 'Optional - Add business name, logo, and bio'}
                </p>
              </div>
            </div>
            {showBusinessBranding ? (
              <ChevronUp className="h-5 w-5 text-sand-400" />
            ) : (
              <div className="flex items-center gap-2 text-primary-600">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Add</span>
              </div>
            )}
          </button>

          {showBusinessBranding && (
            <div className="space-y-5">

            {/* Logo upload */}
            <div>
              <label className="block text-sm font-medium text-sand-700 mb-3">
                Company Logo
              </label>
              <div className="flex items-start gap-4">
                <div 
                  className={`relative h-20 w-20 rounded-xl border-2 border-dashed flex items-center justify-center shrink-0 transition-all ${
                    logoUrl 
                      ? 'border-primary-300 bg-primary-50' 
                      : 'border-sand-300 bg-sand-50 hover:border-sand-400 hover:bg-sand-100 cursor-pointer'
                  }`}
                  onClick={() => !logoUrl && fileInputRef.current?.click()}
                >
                  {logoUrl ? (
                    <>
                      <img 
                        src={logoUrl} 
                        alt="Logo preview" 
                        className="h-full w-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLogo();
                        }}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <Camera className="h-6 w-6 text-sand-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                  {!logoUrl && (
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      icon={<Upload className="h-4 w-4" />}
                    >
                      Upload logo
                    </Button>
                  )}
                  <p className="text-xs text-sand-500 mt-2">
                    PNG, JPG up to 5MB. Square images work best.
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="Company / Business Name"
              placeholder="Barcelona Walking Tours"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              hint="Shown on proposals instead of your personal name"
            />

            <Textarea
              label="Bio / About"
              placeholder="Tell your clients about your experience and what makes your tours special..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              hint="Optional - displayed on your public proposals"
            />
            </div>
          )}
        </Card>

        {/* Payments */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-light text-sand-900">
                Payments
              </h2>
              <p className="text-sm text-sand-500">Accept deposits directly to your Stripe account</p>
            </div>
          </div>

          {!paymentsEnabled ? (
            <div className="space-y-4">
              {!stripeAccountId ? (
                <>
                  <p className="text-sm text-sand-600">
                    Connect your Stripe account to accept deposits. Guests pay directly to your account—Rendez never holds funds.
                  </p>
                  <Button
                    type="button"
                    onClick={handleConnectStripe}
                    loading={connectingStripe}
                    icon={<CreditCard className="h-4 w-4" />}
                  >
                    Connect Stripe
                  </Button>
                </>
              ) : !stripeChargesEnabled ? (
                <>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 mb-1">
                          Finish Stripe Setup
                        </p>
                        <p className="text-sm text-amber-700">
                          {stripeDetailsSubmitted
                            ? 'Stripe needs a few more details to enable payments.'
                            : 'Complete your Stripe onboarding to start accepting payments.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleManageStripe}
                    loading={connectingStripe}
                    icon={<ExternalLink className="h-4 w-4" />}
                  >
                    Finish Stripe Setup
                  </Button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-900 mb-1">
                      Payments Enabled
                    </p>
                    <p className="text-sm text-emerald-700">
                      You can accept deposits. Funds go directly to your Stripe account.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleManageStripe}
                  loading={connectingStripe}
                  icon={<ExternalLink className="h-4 w-4" />}
                >
                  Manage in Stripe
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Preview */}
        <Card variant="outlined" padding="md">
          <p className="eyebrow mb-3">
            Client Preview
          </p>
          <div className="flex items-center gap-4">
            {profilePhotoUrl ? (
              <img 
                src={profilePhotoUrl} 
                alt="Profile" 
                className="h-12 w-12 rounded-full object-cover border-2 border-sand-200"
              />
            ) : logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-12 w-12 object-contain rounded-xl"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <p className="font-display font-light text-sand-900">
                {businessName || fullName || 'Your Name'}
              </p>
              <p className="text-sm text-sand-500">
                How clients see you on proposals
              </p>
            </div>
          </div>
        </Card>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            Profile updated successfully!
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            type="submit" 
            loading={saving || uploadingLogo} 
            icon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
