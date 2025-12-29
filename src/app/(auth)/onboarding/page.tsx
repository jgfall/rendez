'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  ArrowLeft,
  Sparkles, 
  Building2,
  Upload,
  Check,
  Globe,
  Wallet,
  User,
  Camera,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Textarea, Select, Card, Logo, PricingTable, type Plan } from '@/components/ui';
import type { BusinessStage } from '@/types/database';

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

type Step = 'welcome' | 'pricing' | 'business-stage' | 'profile' | 'business-details';

const pricingPlans: Plan[] = [
  {
    title: "Free",
    price: {
      monthly: 0,
      yearly: 0
    },
    description: "Perfect for getting started",
    features: [
      "1 tour template",
      "Basic support",
      "Stripe fees + 3%"
    ],
    ctaText: "Get Started",
    ctaHref: "/signup",
    isFeatured: false
  },
  {
    title: "Pro",
    price: {
      monthly: 29,
      yearly: 278 // $29 * 12 * 0.8 (20% discount for yearly billing)
    },
    description: "For growing businesses",
    features: [
      "Unlimited templates",
      "Customization",
      "White label",
      "No added fees"
    ],
    ctaText: "Upgrade to Pro",
    ctaHref: "/signup?plan=pro",
    isFeatured: true
  }
];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [businessStage, setBusinessStage] = useState<BusinessStage | null>(null);
  
  // Profile fields
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  
  // Business fields
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Pre-fill name from Google OAuth if available
      if (user && !fullName) {
        // Try to get name from user metadata (Google OAuth provides this)
        const name = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.user_metadata?.display_name || 
                     '';
        if (name) {
          setFullName(name);
        }
      }

      // Check if already has profile with completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.push('/app/tours');
        return;
      }

      setCheckingAuth(false);
    };

    checkUser();
  }, [router, supabase, fullName]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
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

  const uploadLogo = async (userId: string): Promise<string | null> => {
    if (!logoFile) return null;

    setUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${userId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) {
        console.error('Logo upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Logo upload error:', err);
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Upload logo if present
      let uploadedLogoUrl: string | null = null;
      if (logoFile) {
        uploadedLogoUrl = await uploadLogo(user.id);
      }

      // Determine the display name for proposals
      const displayBusinessName = businessStage === 'established' && businessName.trim() 
        ? businessName.trim() 
        : null;

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName.trim() || null,
          timezone,
          currency,
          business_stage: businessStage,
          business_name: displayBusinessName,
          logo_url: uploadedLogoUrl,
          bio: bio.trim() || null,
          onboarding_completed: true,
        });

      if (dbError) {
        setError(dbError.message);
        return;
      }

      router.push('/app/tours');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 'welcome') {
      setStep('pricing');
    } else if (step === 'pricing') {
      setStep('business-stage');
    } else if (step === 'business-stage' && businessStage) {
      setStep('profile');
    } else if (step === 'profile') {
      if (businessStage === 'established') {
        setStep('business-details');
      } else {
        handleSubmit();
      }
    } else if (step === 'business-details') {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step === 'pricing') {
      setStep('welcome');
    } else if (step === 'business-stage') {
      setStep('pricing');
    } else if (step === 'profile') {
      setStep('business-stage');
    } else if (step === 'business-details') {
      setStep('profile');
    }
  };

  const canProceed = () => {
    if (step === 'welcome') return true;
    if (step === 'pricing') return true;
    if (step === 'business-stage') return businessStage !== null;
    if (step === 'profile') return fullName.trim().length > 0;
    if (step === 'business-details') return businessName.trim().length > 0;
    return false;
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalSteps = businessStage === 'established' ? 5 : 4;
  const currentStepNumber = 
    step === 'welcome' ? 1 : 
    step === 'pricing' ? 2 :
    step === 'business-stage' ? 3 : 
    step === 'profile' ? 4 : 5;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-100/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-ocean-100/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-sand-500">Step {currentStepNumber} of {totalSteps}</span>
            <span className="text-sm font-medium text-sand-700">
              {Math.round((currentStepNumber / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStepNumber / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center mb-8">
              <Logo size="lg" className="h-10" />
            </div>
            <h1 className="font-display text-4xl font-light text-sand-900 mb-3">
              Welcome to Rendez
            </h1>
            <p className="text-lg text-sand-600 mb-8 max-w-md mx-auto">
              The beautiful way to share tour itineraries and collect deposits from your clients.
            </p>
            <Button 
              size="lg" 
              onClick={nextStep}
              icon={<ArrowRight className="h-5 w-5" />}
              className="px-8"
            >
              Let&apos;s get started
            </Button>
          </div>
        )}

        {/* Step: Pricing */}
        {step === 'pricing' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-light text-sand-900 mb-2">
                Choose Your Plan
              </h1>
              <p className="text-sand-600">
                Start free, upgrade anytime
              </p>
            </div>

            <div className="mb-6">
              <PricingTable plans={pricingPlans} showHeader={false} showCTA={false} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={nextStep} 
                className="flex-1"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Business Stage */}
        {step === 'business-stage' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-light text-sand-900 mb-2">
                Tell us about your business
              </h1>
              <p className="text-sand-600">
                This helps us customize your experience
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <button
                onClick={() => setBusinessStage('just_starting')}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                  businessStage === 'just_starting'
                    ? 'border-primary-500 bg-primary-50/50 shadow-lg shadow-primary-500/10'
                    : 'border-sand-200 bg-white hover:border-sand-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                    businessStage === 'just_starting'
                      ? 'bg-primary-500 text-white'
                      : 'bg-sand-100 text-sand-600'
                  }`}>
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl font-light text-sand-900">
                        I&apos;m just starting out
                      </h3>
                      {businessStage === 'just_starting' && (
                        <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sand-600 text-sm mt-1">
                      New to the tour guide business? We&apos;ll walk you through everything step by step.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setBusinessStage('established')}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                  businessStage === 'established'
                    ? 'border-primary-500 bg-primary-50/50 shadow-lg shadow-primary-500/10'
                    : 'border-sand-200 bg-white hover:border-sand-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                    businessStage === 'established'
                      ? 'bg-primary-500 text-white'
                      : 'bg-sand-100 text-sand-600'
                  }`}>
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl font-light text-sand-900">
                        I have an established business
                      </h3>
                      {businessStage === 'established' && (
                        <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sand-600 text-sm mt-1">
                      Already running tours? Set up your company branding and import your existing itineraries.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={nextStep} 
                disabled={!canProceed()}
                className="flex-1"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Profile */}
        {step === 'profile' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-ocean-500 to-ocean-600 shadow-xl shadow-ocean-500/25 mb-4">
                <User className="h-7 w-7 text-white" />
              </div>
              <h1 className="font-display text-3xl font-light text-sand-900 mb-2">
                Your profile
              </h1>
              <p className="text-sand-600">
                Tell us a bit about yourself
              </p>
            </div>

            <Card variant="glass" padding="lg" className="mb-6">
              <div className="space-y-5">
                <Input
                  label="Your Full Name"
                  type="text"
                  placeholder="Maria Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Globe className="h-5 w-5 text-sand-400 mt-8 shrink-0" />
                    <Select
                      label="Timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      options={timezones}
                    />
                  </div>

                  <div className="flex items-start gap-2">
                    <Wallet className="h-5 w-5 text-sand-400 mt-8 shrink-0" />
                    <Select
                      label="Currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      options={currencies}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-6">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={nextStep} 
                disabled={!canProceed()}
                loading={loading && businessStage === 'just_starting'}
                className="flex-1"
              >
                {businessStage === 'established' ? 'Continue' : 'Get started'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Business Details (only for established businesses) */}
        {step === 'business-details' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-xl shadow-primary-500/25 mb-4">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <h1 className="font-display text-3xl font-light text-sand-900 mb-2">
                Your business
              </h1>
              <p className="text-sand-600">
                This is what clients will see on your proposals
              </p>
            </div>

            <Card variant="glass" padding="lg" className="mb-6">
              <div className="space-y-5">
                {/* Logo upload */}
                <div>
                  <label className="block text-sm font-medium text-sand-700 mb-3">
                    Company Logo
                  </label>
                  <div className="flex items-start gap-4">
                    <div 
                      className={`relative h-24 w-24 rounded-2xl border-2 border-dashed flex items-center justify-center shrink-0 transition-all ${
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
                            className="h-full w-full object-contain rounded-xl"
                          />
                          <button
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
                        <Camera className="h-8 w-8 text-sand-400" />
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
                  label="Company Name"
                  type="text"
                  placeholder="Barcelona Walking Tours"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  hint="This will appear on all your proposals"
                />

                <Textarea
                  label="Short Bio"
                  placeholder="Tell your clients a bit about your company..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  hint="Optional - appears on your proposals"
                />
              </div>
            </Card>

            {/* Preview card */}
            <div className="mb-6">
              <p className="eyebrow mb-2">
                Preview
              </p>
              <Card variant="outlined" padding="sm">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo" 
                      className="h-10 w-10 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sand-900 text-sm">
                      {businessName || 'Your Company Name'}
                    </p>
                    <p className="text-xs text-sand-500">
                      How it appears to clients
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-6">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={nextStep} 
                disabled={!canProceed()}
                loading={loading || uploadingLogo}
                className="flex-1"
                icon={<Sparkles className="h-4 w-4" />}
              >
                Complete setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
