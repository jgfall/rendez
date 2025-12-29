'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Card } from '@/components/ui';
import { RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';

const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = 'test123456';

interface Status {
  exists: boolean;
  email: string;
  userId?: string;
  profile?: {
    onboarding_completed: boolean;
    full_name: string | null;
  } | null;
  tour_count?: number;
  error?: string;
}

export default function TestSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    account?: {
      email: string;
      password: string;
      userId: string;
    };
    tours_created?: number;
    tours?: Array<{ id: string; name: string; blocks_count: number }>;
  } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/test/setup');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({ exists: false, email: TEST_EMAIL });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          error: data.error || 'Setup failed',
        });
        return;
      }

      setResult({
        success: true,
        ...data,
      });
      // Refresh status after setup
      await fetchStatus();
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (error) {
        setResult({
          success: false,
          error: `Login failed: ${error.message}`,
        });
        return;
      }

      // Redirect to onboarding
      router.push('/onboarding');
      router.refresh();
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Login failed',
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card variant="outlined" padding="lg" className="max-w-md">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-semibold text-sand-900 mb-2">
              Not Available
            </h1>
            <p className="text-sand-600">
              Test setup is only available in development mode.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-light text-sand-900 mb-2">
            Test Account Setup
          </h1>
          <p className="text-sand-600">
            Set up a test account with sample tour templates
          </p>
        </div>

        <Card variant="glass" padding="lg" className="mb-6">
          <div className="space-y-4">
            <div>
              <h2 className="font-medium text-sand-900 mb-2">Test Account Credentials</h2>
              <div className="bg-sand-50 rounded-xl p-4 space-y-2 font-mono text-sm">
                <div>
                  <span className="text-sand-500">Email:</span>{' '}
                  <span className="text-sand-900">{TEST_EMAIL}</span>
                </div>
                <div>
                  <span className="text-sand-500">Password:</span>{' '}
                  <span className="text-sand-900">{TEST_PASSWORD}</span>
                </div>
              </div>
            </div>

            {statusLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-sand-400" />
              </div>
            ) : status && status.exists ? (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start gap-2 mb-2">
                  <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Account exists</p>
                    <div className="mt-2 space-y-1 text-xs text-blue-700">
                      <div>Status: {status.profile?.onboarding_completed ? 'Onboarding completed' : 'Onboarding pending'}</div>
                      {status.tour_count !== undefined && (
                        <div>Tours: {status.tour_count} template(s)</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Test account not found. Click &quot;Reset & Setup Test Account&quot; to create it.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSetup}
                loading={loading}
                icon={<RefreshCw className="h-4 w-4" />}
                className="flex-1"
              >
                Reset & Setup Test Account
              </Button>
              {result?.success && (
                <Button
                  onClick={handleLogin}
                  loading={loading}
                  variant="default"
                  className="flex-1"
                >
                  Login as Test User
                </Button>
              )}
            </div>
          </div>
        </Card>

        {result && (
          <Card
            variant={result.success ? 'outlined' : 'outlined'}
            padding="lg"
            className={result.success ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-medium mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? 'Setup Complete!' : 'Setup Failed'}
                </h3>
                {result.error && (
                  <p className="text-sm text-red-700 mb-3">{result.error}</p>
                )}
                {result.success && (
                  <div className="space-y-2 text-sm">
                    <p className="text-green-800">
                      Successfully reset test account and created {result.tours_created || 0} tour template(s).
                    </p>
                    {result.tours && result.tours.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-green-700 font-medium mb-2">Created Tours:</p>
                        <ul className="space-y-1 text-green-700">
                          {result.tours.map((tour) => (
                            <li key={tour.id} className="flex items-center justify-between">
                              <span>{tour.name}</span>
                              <span className="text-green-600 text-xs">
                                {tour.blocks_count} blocks
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <p className="text-green-700 text-xs mb-2">
                        Click "Login as Test User" to sign in and test the onboarding flow.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-sand-500">
            This page is only available in development mode. The test account has onboarding
            reset and includes pre-loaded tour templates.
          </p>
        </div>
      </div>
    </div>
  );
}

