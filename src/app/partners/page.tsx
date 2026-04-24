'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, ChevronDown, ChevronUp, DollarSign, Users, Zap, Shield } from 'lucide-react';

// ── FAQ data ───────────────────────────────────────────────────────────────────

const FAQS = [
    {
        q: 'When do I get paid?',
        a: 'Whop processes affiliate payouts weekly. Funds are available once your balance exceeds $25 — that\'s just two signups.',
    },
    {
        q: 'Do I need a minimum follower count?',
        a: 'No. If you have an audience — even a small Discord server or a newsletter with 200 subscribers — you can apply.',
    },
    {
        q: 'What if the person I refer cancels after the trial?',
        a: 'You still earn $15. The bounty pays on trial signup, not on conversion to a paid plan. One $5 payment = your $15.',
    },
    {
        q: 'Can I promote on multiple platforms?',
        a: 'Yes. Use the same affiliate link everywhere or request platform-specific links for tracking.',
    },
    {
        q: 'Do I need to disclose the affiliate relationship?',
        a: 'Yes — FTC guidelines require clear disclosure on all content featuring an affiliate link. Include "#ad" or "affiliate link" in your post. The content kit includes pre-written disclosures.',
    },
    {
        q: 'Can I run paid ads?',
        a: 'Not on TradeMind brand terms (e.g., Google Ads bidding on "TradeMind") without written approval. Organic content only in Phase 1.',
    },
    {
        q: 'Is there a higher rate for large audiences?',
        a: 'Yes. If your audience exceeds 50,000, email partnerships@trademind.bot for a custom rate discussion — up to $25 per signup.',
    },
    {
        q: "What is TradeMind's refund policy?",
        a: 'No refunds on the $5 trial — it is a one-time access fee, not a subscription. This is clearly stated at checkout.',
    },
];

const MATH_ROWS = [
    { event: 'Someone clicks your link and pays $5 for the trial', earn: '$15 immediately' },
    { event: '10 signups in a month', earn: '$150' },
    { event: '50 signups in a month', earn: '$750' },
    { event: '100 signups in a month', earn: '$1,500' },
];

const WHY_ROWS = [
    {
        icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
        title: 'The price is $5.',
        desc: 'There is no "I need to think about it" at $5. The friction is almost zero.',
    },
    {
        icon: <Zap className="w-5 h-5 text-purple-400" />,
        title: 'The product is tangible.',
        desc: 'Daily signal at 3 PM EST — your audience sees real output on day one, not vague promises.',
    },
    {
        icon: <CheckCircle className="w-5 h-5 text-blue-400" />,
        title: 'The backtest is credible.',
        desc: '39% CAGR over 7 years. The 2022 bear market stress test is on the page. This is not a generic signals service.',
    },
    {
        icon: <Shield className="w-5 h-5 text-amber-400" />,
        title: 'No auto-charge.',
        desc: 'The trial ends at 30 days and nothing happens unless the user chooses to continue. Low-risk perception = higher conversion.',
    },
    {
        icon: <Users className="w-5 h-5 text-pink-400" />,
        title: 'The audience is huge.',
        desc: '30 million new retail investors entered the market since 2020. Systematic, signal-based trading is exactly where they are heading.',
    },
];

const STEPS = [
    {
        n: '01',
        title: 'Apply',
        desc: 'Fill out the short form below. Approval typically takes 24 hours. You\'ll receive your unique affiliate link and content kit by email.',
    },
    {
        n: '02',
        title: 'Share',
        desc: 'Use the ready-made content kit — TikTok hooks, tweet threads, Discord templates, newsletter copy. Or create your own. Every signup earns you $15.',
    },
    {
        n: '03',
        title: 'Get paid',
        desc: 'Whop pays out weekly. Minimum $25 before withdrawal. No invoicing, no chasing. It just arrives.',
    },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function PartnersPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <main className="min-h-screen bg-black text-white">

            {/* ── Nav ─────────────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="font-black text-lg tracking-tight">
                        TradeMind<span className="text-purple-400">.bot</span>
                    </Link>
                    <Link
                        href="/partners/apply"
                        className="text-sm font-semibold bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Apply now →
                    </Link>
                </div>
            </nav>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="pt-36 pb-24 px-4 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-600/12 blur-[140px] rounded-full" />
                </div>
                <div className="relative max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-emerald-300 text-sm font-medium mb-8">
                        <DollarSign className="w-3.5 h-3.5" />
                        Affiliate Program — $15 per signup
                    </div>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
                        Earn $15 every time<br />
                        <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                            someone pays $5.
                        </span>
                    </h1>

                    <p className="text-gray-400 text-xl md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        TradeMind pays affiliates a flat{' '}
                        <strong className="text-white">$15 bounty</strong> for every 30-day trial signup.
                        The ask to your audience is just $5 — the easiest yes in trading.
                    </p>

                    <Link
                        href="/partners/apply"
                        className="group inline-flex items-center gap-3 bg-white text-black font-bold px-10 py-5 rounded-xl text-xl hover:bg-gray-100 transition-all shadow-[0_0_60px_rgba(255,255,255,0.1)]"
                    >
                        Apply to become a partner
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <p className="text-sm text-gray-500 mt-4">
                        Paid weekly via Whop. No minimum audience size required.
                    </p>
                </div>
            </section>

            {/* ── The Math ─────────────────────────────────────────────────── */}
            <section className="py-20 px-4 border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black mb-4 text-center">The numbers are simple.</h2>
                    <p className="text-gray-400 text-center mb-12 text-lg max-w-2xl mx-auto">
                        Most affiliate programs pay you a slice of a product your audience resists buying. TradeMind flips that.
                    </p>

                    {/* Big stat */}
                    <div className="flex justify-center gap-8 mb-12">
                        <div className="text-center">
                            <div className="text-6xl md:text-8xl font-black text-gray-600 line-through">$5</div>
                            <div className="text-sm text-gray-500 mt-2">they pay</div>
                        </div>
                        <div className="flex items-center text-4xl text-gray-600 font-black pb-6">→</div>
                        <div className="text-center">
                            <div className="text-6xl md:text-8xl font-black text-emerald-400">$15</div>
                            <div className="text-sm text-emerald-400/70 mt-2">you earn</div>
                        </div>
                    </div>

                    {/* Math table */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden mb-10">
                        <table className="w-full text-sm md:text-base">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.03]">
                                    <th className="text-left p-4 md:p-5 text-gray-400 font-semibold">What happens</th>
                                    <th className="text-right p-4 md:p-5 text-gray-400 font-semibold">What you earn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {MATH_ROWS.map((row) => (
                                    <tr key={row.earn} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 md:p-5 text-gray-300">{row.event}</td>
                                        <td className="p-4 md:p-5 text-right font-black text-emerald-400 text-lg">{row.earn}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-gray-400 text-center leading-relaxed max-w-2xl mx-auto">
                        Your audience is paying $5 — less than a coffee — which means almost no objection to close.
                        You earn $15 per yes. No recurring complexity. No waiting for the customer to stay subscribed.
                        You get paid within 48 hours of their signup, weekly via Whop.
                    </p>
                </div>
            </section>

            {/* ── Why It Converts ──────────────────────────────────────────── */}
            <section className="py-20 px-4 bg-white/[0.02] border-y border-white/5">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black mb-12 text-center">
                        Why your audience says yes to this.
                    </h2>
                    <div className="space-y-5">
                        {WHY_ROWS.map((row) => (
                            <div
                                key={row.title}
                                className="flex gap-4 bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    {row.icon}
                                </div>
                                <div>
                                    <span className="font-bold text-white">{row.title}</span>{' '}
                                    <span className="text-gray-400">{row.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works ─────────────────────────────────────────────── */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black mb-14 text-center">Three steps.</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {STEPS.map((step) => (
                            <div key={step.n} className="relative">
                                <div className="text-5xl font-black text-white/8 mb-4">{step.n}</div>
                                <h3 className="text-xl font-black text-white mb-3">{step.title}</h3>
                                <p className="text-gray-400 leading-relaxed text-sm">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── About TradeMind ──────────────────────────────────────────── */}
            <section className="py-20 px-4 bg-white/[0.02] border-y border-white/5">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black mb-8">What you&apos;re promoting.</h2>
                    <p className="text-gray-400 text-lg leading-relaxed mb-10">
                        TradeMind is an AI-powered trading signal service built for the Nasdaq-100. The core engine — TurboCore — uses
                        machine learning to detect BULL, BEAR, and CASH regime shifts before price confirms the move.
                    </p>

                    {/* Performance stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        {[
                            { val: '39%', label: 'CAGR', sub: '7-year backtest' },
                            { val: '-11%', label: 'Max drawdown', sub: 'TurboCore 2018–2025' },
                            { val: '-79%', label: 'Max drawdown', sub: 'TQQQ same period' },
                            { val: '3 PM', label: 'Daily signal', sub: 'EST, every market day' },
                        ].map((stat) => (
                            <div key={stat.label + stat.val} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center">
                                <div className="text-3xl font-black text-white mb-1">{stat.val}</div>
                                <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">{stat.label}</div>
                                <div className="text-[10px] text-gray-500 mt-1">{stat.sub}</div>
                            </div>
                        ))}
                    </div>

                    <p className="text-gray-400 leading-relaxed mb-3">
                        Every day at 3 PM EST, members receive a signal with the current regime, position allocation, and AI briefing.
                        The 30-day trial gives members access to 22 live signals and the full community before they commit to a paid plan.
                    </p>
                    <p className="text-xs text-gray-600">
                        Past performance does not guarantee future results. TradeMind signals are educational analysis, not personalized investment advice.
                    </p>
                </div>
            </section>

            {/* ── FAQ ──────────────────────────────────────────────────────── */}
            <section className="py-20 px-4">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black text-center mb-14">Common questions.</h2>
                    <div className="space-y-3">
                        {FAQS.map((faq, i) => (
                            <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="font-semibold text-white pr-4">{faq.q}</span>
                                    {openFaq === i
                                        ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                                        : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                    }
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="py-24 px-4 text-center relative overflow-hidden border-t border-white/5">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-600/8 blur-[140px]" />
                </div>
                <div className="relative max-w-xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Ready to start earning?
                    </h2>
                    <p className="text-gray-400 text-xl mb-10">
                        Apply in 2 minutes. Approval in 24 hours. First payout after two signups.
                    </p>
                    <Link
                        href="/partners/apply"
                        className="group inline-flex items-center gap-3 bg-white text-black font-bold px-10 py-5 rounded-xl text-xl hover:bg-gray-100 transition-all shadow-[0_0_60px_rgba(255,255,255,0.08)]"
                    >
                        Apply to become a partner
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <p className="text-xs text-gray-600 mt-8 max-w-lg mx-auto leading-relaxed">
                        TradeMind affiliate commissions are paid on confirmed trial purchases only. Fraudulent signups (self-referrals,
                        fake accounts) will result in immediate removal. TradeMind reserves the right to modify commission rates with
                        30 days notice to active affiliates.
                    </p>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <footer className="border-t border-white/5 py-8 px-4">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">© 2025 TradeMind.bot</div>
                    <div className="flex items-center gap-6 text-sm">
                        <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">Terms</Link>
                        <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">Privacy</Link>
                        <Link href="/refer" className="text-gray-500 hover:text-white transition-colors">Member Referrals</Link>
                        <Link href="/partners/apply" className="text-gray-500 hover:text-white transition-colors">Apply</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
