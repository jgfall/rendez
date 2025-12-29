import Link from 'next/link';
import { ArrowRight, Map, Shield, Zap } from 'lucide-react';
import { Button, Card, Logo, PricingTable, type Plan } from '@/components/ui';

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

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-sand-200/50">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary-100/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-ocean-100/20 rounded-full blur-3xl" />
        </div>

        {/* Navigation */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex items-center justify-between">
          <Logo href="/" size="lg" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="md">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="md">Get Started</Button>
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32 text-center">
          <h1 className="font-display text-7xl sm:text-8xl lg:text-9xl xl:text-[120px] font-light text-sand-900 leading-[1.1] mb-6 tracking-tight">
            The #1 Way to Run 
            <br />
            <span className="gradient-text">Your Private Tour Business</span>
          </h1>
          <p className="text-lg sm:text-xl text-sand-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create stunning, personalized tour proposals that convert. 
            Impress your clients with professional itineraries and secure bookings with ease.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8">
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
      <section className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 bg-sand-50/30">
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
