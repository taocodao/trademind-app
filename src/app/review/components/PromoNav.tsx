'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/review/generate', label: 'Generate' },
  { href: '/review/library', label: 'My Library' },
  { href: '/review/results', label: 'Results' },
  { href: '/review/about', label: 'About' },
  { href: '/review/pricing', label: 'Pricing' },
];

export function PromoNav() {
  const pathname = usePathname();
  const { authenticated, user, login, logout } = usePrivy();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="promo-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/review" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:shadow-purple-500/40 transition-all duration-200">
                TM
              </div>
              <span className="font-semibold text-[#F8FAFC] text-sm hidden sm:block">
                TradeMind <span className="text-[#7C3AED]">Ambassador Hub</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === link.href
                      ? 'bg-[#7C3AED]/20 text-[#A78BFA]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Auth + Mobile Toggle */}
            <div className="flex items-center gap-3">
              {authenticated ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:block text-xs text-[#94A3B8] max-w-[140px] truncate">
                    {user?.email?.address || 'Ambassador'}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => login()}
                  className="promo-cta-btn text-white text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  Sign In
                </button>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden text-[#94A3B8] hover:text-[#F8FAFC] p-2"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5">
            <div className="px-4 py-3 space-y-1 bg-[#0A0A0F]/95 backdrop-blur-xl">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-[#7C3AED]/20 text-[#A78BFA]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
      {/* Spacer for fixed nav */}
      <div className="h-16" />
    </>
  );
}
