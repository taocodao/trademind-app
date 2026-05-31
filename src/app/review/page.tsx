import Link from 'next/link';
import { PromoNav } from './components/PromoNav';
import { PromoFooter } from './components/PromoFooter';

const STATS = [
  { value: '27.8%', label: 'CAGR (2019–2025)', color: '#10B981' },
  { value: '86%', label: 'Win Rate', color: '#10B981' },
  { value: '-5.1%', label: 'Max Drawdown', color: '#F59E0B' },
  { value: '-11%', label: 'vs -83% TQQQ in 2022', color: '#10B981' },
];

const FEATURES = [
  {
    icon: '📡',
    title: '6 Platforms Supported',
    description: 'TikTok, Discord, Whop, X, Instagram, LinkedIn — each with its own AI-tuned prompt.',
  },
  {
    icon: '🎨',
    title: '12 Themes × 7 Tones',
    description: 'From Backtest Story to LEAPS Education. Calm Data-Driven to High Energy FOMO.',
  },
  {
    icon: '✅',
    title: 'Compliance Auto-Added',
    description: 'NFA disclaimer is automatically injected so every post is share-ready.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Select your platform', desc: 'TikTok, Discord, X, Instagram, LinkedIn, or Whop.' },
  { step: '02', title: 'Pick a theme & tone', desc: 'Choose from 12 pre-built themes or write your own.' },
  { step: '03', title: 'Generate 3 variations', desc: 'AI writes 3 distinct posts in seconds.' },
  { step: '04', title: 'Copy & post', desc: 'One click to copy. Paste directly into your platform.' },
];

export default function ReviewHomePage() {
  return (
    <div className="min-h-screen">
      <PromoNav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="promo-hero-bg relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-[#5B21B6]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-full px-4 py-1.5 mb-6 fade-in-up">
            <span className="text-[#A78BFA] text-xs font-semibold uppercase tracking-wider">Ambassador Hub</span>
            <span className="text-[#64748B] text-xs">For TradeMind Community Members</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F8FAFC] leading-tight mb-6 fade-in-up fade-in-up-1">
            Generate TradeMind
            <span className="block mt-1 bg-gradient-to-r from-[#7C3AED] via-[#A78BFA] to-[#7C3AED] bg-clip-text text-transparent">
              Promo Posts in Seconds
            </span>
          </h1>

          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed fade-in-up fade-in-up-2">
            AI-powered post generator for ambassadors. Select your platform, pick a theme, and get 3 ready-to-post variations — with NFA compliance automatically included.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in-up fade-in-up-3">
            <Link
              href="/review/generate"
              className="promo-cta-btn inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-xl text-base"
            >
              <span>✨</span>
              Start Generating Posts
            </Link>
            <Link
              href="/review/results"
              className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#F8FAFC] font-medium px-6 py-4 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200"
            >
              View Backtest Results →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ──────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#1A1A2E]/30">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div
                className="stat-number text-3xl font-bold mb-1"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
              <div className="text-xs text-[#64748B] leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] text-center mb-3">
          Everything you need to promote TradeMind
        </h2>
        <p className="text-[#94A3B8] text-center mb-12 max-w-xl mx-auto">
          Built for ambassadors who want to share real data, not fluff.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="promo-glass p-6">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-[#F8FAFC] mb-2">{f.title}</h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="border-t border-white/5 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-[#7C3AED]/30 to-transparent -translate-y-px" />
                )}
                <div className="text-xs font-mono text-[#7C3AED] font-bold mb-3">{step.step}</div>
                <h3 className="font-semibold text-[#F8FAFC] mb-2 text-sm">{step.title}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="promo-glass p-10 text-center" style={{ background: 'rgba(124, 58, 237, 0.05)' }}>
          <h2 className="text-2xl font-bold text-[#F8FAFC] mb-3">Ready to create your first post?</h2>
          <p className="text-[#94A3B8] mb-8 text-sm">
            Join the TradeMind ambassador program and start sharing data-driven content today.
          </p>
          <Link
            href="/review/generate"
            className="promo-cta-btn inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-xl"
          >
            ✨ Open Post Generator
          </Link>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
