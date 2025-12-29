'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard,
  Map, 
  FileText, 
  DollarSign,
  User, 
  LogOut, 
  Menu, 
  X
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Logo } from '@/components/ui';

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/tours', label: 'Tours', icon: Map },
  { href: '/app/proposals', label: 'Proposals', icon: FileText },
  { href: '/app/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/app/profile', label: 'Profile', icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-sand-200 px-6 py-6">
          {/* Logo (Centered) */}
          <div className="flex justify-center mb-4">
            <Logo href="/app" size="md" />
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        group flex gap-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                        ${isActive 
                          ? 'bg-primary-50 text-primary-700 font-semibold' 
                          : 'text-sand-600 hover:bg-sand-50 hover:text-sand-900'
                        }
                      `}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary-600' : 'text-sand-400 group-hover:text-sand-600'}`} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Sign out button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm font-medium text-sand-500 hover:bg-sand-50 hover:text-sand-700 transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </nav>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 lg:hidden">
        <div className="flex h-16 items-center gap-x-4 bg-white/80 backdrop-blur-xl border-b border-sand-200 px-4 shadow-sm">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-sand-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>
          <Logo size="md" />
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-sand-900/50 backdrop-blur-sm" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between px-6 border-b border-sand-200">
              <Logo size="md" />
              <button
                type="button"
                className="-m-2.5 p-2.5 text-sand-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-y-1 px-4 py-4">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex gap-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all
                      ${isActive 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-sand-600 hover:bg-sand-50'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-sand-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm font-medium text-sand-500 hover:bg-sand-50"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

