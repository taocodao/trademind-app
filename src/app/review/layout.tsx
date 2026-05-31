import type { Metadata } from 'next';
import './promo.css';
import { PrivyProvider } from '@/components/providers/PrivyProvider';

export const metadata: Metadata = {
  title: 'TradeMind Ambassador Hub — AI Post Generator',
  description:
    'Generate AI-powered promotional posts for TradeMind in seconds. Select your platform, pick a theme, and copy-paste to TikTok, Discord, X, Instagram, LinkedIn, or Whop.',
  openGraph: {
    title: 'TradeMind Ambassador Hub',
    description: 'Generate TradeMind promo posts powered by AI. For ambassadors.',
    url: 'https://trademind.bot/review',
    siteName: 'TradeMind',
    type: 'website',
  },
};

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider>
      <div className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC] font-sans antialiased">
        {children}
      </div>
    </PrivyProvider>
  );
}
