'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Map, Shield, Zap } from 'lucide-react';
import { Button, Card, Logo, PricingTable, HeroSection, type Plan } from '@/components/ui';

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
      "3% fees on all transactions"
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
    ctaText: "Get Rendez Pro",
    ctaHref: "/signup?plan=pro",
    isFeatured: true
  }
];

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  // Handle OAuth callback if code is present
  useEffect(() => {
    if (code) {
      // Redirect to the callback route with all search params
      const params = new URLSearchParams(searchParams.toString());
      router.replace(`/auth/callback?${params.toString()}`);
    }
  }, [code, searchParams, router]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 sm:mb-20">
            <p className="eyebrow mb-4">Features</p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light text-sand-900 mb-4 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-lg sm:text-xl text-sand-600 max-w-2xl mx-auto leading-relaxed">
              From creating tours to collecting deposits, Rendez handles it all.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <Card variant="elevated" padding="lg" hover className="group">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-shadow">
                <Map className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-display text-3xl font-light text-sand-900 mb-3">
                Beautiful Itineraries
              </h3>
              <p className="text-sand-600 leading-relaxed">
                Create stunning tour proposals with drag-and-drop blocks. 
                Add activities, meals, transport, and more.
              </p>
            </Card>

            <Card variant="elevated" padding="lg" hover className="group">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center mb-6 shadow-lg shadow-ocean-500/20 group-hover:shadow-xl group-hover:shadow-ocean-500/30 transition-shadow">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-display text-3xl font-light text-sand-900 mb-3">
                Secret Spots
              </h3>
              <p className="text-sand-600 leading-relaxed">
                Keep your special locations private until clients confirm. 
                Reveal surprises only after deposit payment.
              </p>
            </Card>

            <Card variant="elevated" padding="lg" hover className="group">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center mb-6 shadow-lg shadow-success-500/20 group-hover:shadow-xl group-hover:shadow-success-500/30 transition-shadow">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-display text-3xl font-light text-sand-900 mb-3">
                Instant Payments
              </h3>
              <p className="text-sand-600 leading-relaxed">
                Collect deposits via Stripe. Clients pay online, 
                you get notified, and the tour unlocks automatically.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 bg-sand-50/30 scroll-mt-20">
        <PricingTable plans={pricingPlans} />
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card variant="glass" padding="lg" className="text-center py-16 sm:py-20">
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light text-sand-900 mb-6 tracking-tight">
              Ready to Transform Your Business?
            </h2>
            <p className="text-lg sm:text-xl text-sand-600 mb-10 max-w-xl mx-auto leading-relaxed">
              Join hundreds of tour guides who are already creating 
              beautiful proposals and closing more bookings.
            </p>
            <Link href="/signup">
              <Button size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                Get Started for Free
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sand-200/50 bg-sand-50/50 py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="md" />
          <p className="text-sm text-sand-500">
            © {new Date().getFullYear()} Rendez. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
