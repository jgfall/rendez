'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { DashboardShowcase } from '@/components/ui/dashboard-showcase';
import { cn } from '@/lib/utils';

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring' as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export function HeroSection() {

  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24 md:pt-36">
            <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]" />
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <h1
                    className="mt-8 max-w-5xl mx-auto text-balance text-7xl sm:text-8xl lg:text-9xl xl:text-[120px] font-light text-sand-900 leading-[1.1] mb-6 tracking-tight">
                    The #1 Way to Run 
                    <br />
                    <span className="gradient-text">Your Private Tour Business</span>
                  </h1>
                  <p
                    className="mx-auto mt-8 max-w-2xl text-balance text-lg sm:text-xl text-sand-600 leading-relaxed">
                    Create stunning, personalized tour proposals that convert. 
                    Impress your clients with professional itineraries and secure bookings with ease.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Button
                    key={1}
                    asChild
                    size="lg"
                    icon={<ArrowRight className="h-5 w-5" />}>
                    <Link href="/signup">
                      Get Started for Free
                    </Link>
                  </Button>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="outline">
                    <Link href="/login">
                      View Demo
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <DashboardShowcase
              layout="dashboard"
              screenshots={[
                '/proposal.png',        // Left side - Tour proposal
                '/dashboard.png',       // Top right - Dashboard metrics & calendar
                '/block-1.png',         // Bottom right section 1
                '/block-2.png',         // Bottom right section 2
              ]}
            />
          </div>
        </section>
      </main>
    </>
  );
}

const menuItems = [
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
];

const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  if (href.startsWith('#')) {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
};

const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <header>
      <nav
        data-state={menuState && 'active'}
        className="fixed z-20 w-full px-2 group">
        <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5')}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <div className={cn('transition-all duration-300', isScrolled ? 'scale-90' : 'scale-100')}>
                <Logo href="/" size={isScrolled ? 'md' : 'lg'} />
              </div>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className="text-muted-foreground hover:text-accent-foreground block duration-150">
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile Menu */}
            <div className="bg-background group-data-[state=active]:block hidden w-full rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 mb-6 lg:hidden dark:shadow-none">
              <ul className="space-y-6 text-base mb-6">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      onClick={(e) => {
                        handleNavClick(e, item.href);
                        setMenuState(false);
                      }}
                      className="text-muted-foreground hover:text-accent-foreground block duration-150">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col space-y-3">
                <Button
                  asChild
                  variant="ghost"
                  size="md">
                  <Link href="/login">
                    Sign in
                  </Link>
                </Button>
                <Button
                  asChild
                  size="md">
                  <Link href="/signup">
                    Get Started
                  </Link>
                </Button>
              </div>
            </div>

            {/* Desktop Menu Buttons */}
            <div className="hidden lg:flex lg:gap-6 lg:items-center">
              <Button
                asChild
                variant="ghost"
                size="md"
                className={cn(isScrolled && 'hidden')}>
                <Link href="/login">
                  Sign in
                </Link>
              </Button>
              <Button
                asChild
                size="md"
                className={cn(isScrolled && 'hidden')}>
                <Link href="/signup">
                  Get Started
                </Link>
              </Button>
              <Button
                asChild
                size="md"
                className={cn(isScrolled ? 'inline-flex' : 'hidden')}>
                <Link href="/signup">
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};


