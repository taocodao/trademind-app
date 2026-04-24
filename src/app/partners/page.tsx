'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    TrendingUp, DollarSign, Users, Repeat, ArrowRight,
    CheckCircle, Copy, ChevronDown, ChevronUp, Zap,
    BarChart3, Gift, Share2, FileText, Twitter, Youtube,
} from 'lucide-react';

// ── Static content ─────────────────────────────────────────────────────────────

const COMMISSION_ROWS = [
    {
        event: 'Trial Signup',
        timing: 'When $5 payment clears',
        amount: '$10 flat',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        icon: '⚡',
    },
    {
        event: 'Monthly Retention',
        timing: 'Every month subscriber stays',
        amount: '20% recurring',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
        icon: '🔄',
    },
    {
        event: 'Annual Upgrade',
        timing: 'One-time when subscriber upgrades',
        amount: '$25 bonus',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        icon: '🏆',
    },
];

const LTV_ROWS = [
    { label: 'Base ($29/mo)', monthly: '$5.80', yr1: '$79.60', lifetime: '$139.20' },
    { label: 'Pro ($49/mo)', monthly: '$9.80', yr1: '$127.60', lifetime: '$235.20' },
    { label: 'Bundle ($69/mo)', monthly: '$13.80', yr1: '$175.60', lifetime: '$331.20' },
];

const HOOK_SCRIPTS = [
    {
        platform: 'TikTok / Reels',
        icon: '📱',
        hook: '"This AI caught the 2022 crash before TQQQ lost 83%. I\'m sharing the signals. Try it for $5 ↗"',
        cta: 'Link in bio → try for $5',
    },
    {
        platform: 'Twitter / X',
        icon: '🐦',
        hook: 'TurboCore was down 5.1% in 2022 when the market was down 33%. This is what hedging with AI looks like. Link below.',
        cta: 'Attach backtest chart screenshot',
    },
    {
        platform: 'YouTube / Long-form',
        icon: '🎥',
        hook: '"I gave an AI $5,000 and let it trade for 90 days. Here\'s what happened." — then walk through the allocation logic',
        cta: 'Description link + pinned comment',
    },
    {
        platform: 'Reddit',
        icon: '🤖',
        hook: 'Share the 2022 vs TQQQ data in r/investing, r/StockMarket, r/Bogleheads — lead with facts, mention TradeMind as what you use',
        cta: 'Add link only after value is delivered',
    },
];

const FAQS = [
    {
        q: 'When do I get paid?',
        a: 'Whop handles all payouts automatically. The $10 flat fee pays out when the $5 trial payment clears. Monthly recurring commissions pay 30 days after each charge. Annual bonuses pay within 7 days of upgrade.',
    },
    {
        q: 'Is there a minimum payout threshold?',
        a: 'Whop\'s minimum payout is $10. You\'ll hit that on your very first trial referral.',
    },
    {
        q: 'What happens if a subscriber cancels?',
        a: 'Monthly recurring commissions stop when the subscriber cancels. The $10 flat trial fee is yours to keep regardless.',
    },
    {
        q: 'Can I promote on any platform?',
        a: 'Yes — TikTok, YouTube, Instagram, X/Twitter, Reddit, Discord, email lists, newsletters, podcasts. The only restriction is no paid ads using "TradeMind" as a keyword without prior approval.',
    },
    {
        q: 'Do you have tracking links?',
        a: 'Yes — Whop generates a unique tracking link for each affiliate. Every click, trial signup, and conversion is tracked in your Whop affiliate dashboard in real time.',
    },
    {
        q: 'What\'s the trial conversion rate?',
        a: 'We don\'t publish an exact number, but the $5 price point makes it one of the easiest trading products to convert. Gen Z investors who see the 2022 stress test data convert at very high rates.',
    },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function PartnersPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    const WHOP_AFFILIATE_URL = process.env.NEXT_PUBLIC_WHOP_AFFILIATE_URL
        || 'https://whop.com/trademind/?a=affiliate';

    function copyLink() {
        navigator.clipboard.writeText(WHOP_AFFILIATE_URL).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <main className="min-h-screen bg-black text-white">

            {/* ── Nav ─────────────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="font-black text-lg tracking-tight">
                        TradeMind<span className="text-purple-400">.bot</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/refer" className="text-sm text-gray-400 hover:text-white transition-colors">
                            Member Referrals
                        </Link>
                        <a
                            href={WHOP_AFFILIATE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition-colors"
                        >
                            Apply Now →
                        </a>
                    </div>
                </div>
            </nav>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="pt-32 pb-20 px-4 text-center relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/15 blur-[120px] rounded-full" />
                </div>

                <div className="relative max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-purple-300 text-sm font-medium mb-8">
                        <Zap className="w-3.5 h-3.5" />
                        Affiliate Program — Powered by Whop
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
                        Earn while they<br />
                        <span className="bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
                            learn to invest.
                        </span>
                    </h1>

                    <p className="text-gray-400 text-xl md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        Refer traders to TradeMind and earn{' '}
                        <strong className="text-white">$10 upfront</strong> +{' '}
                        <strong className="text-white">20% recurring every month</strong>{' '}
                        they stay. The easiest $5 ask in trading — your audience converts, you get paid for life.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <a
                            href={WHOP_AFFILIATE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-all shadow-[0_0_40px_rgba(168,85,247,0.25)]"
                        >
                            Join Affiliate Program
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>
                        <button
                            onClick={copyLink}
                            className="flex items-center gap-2 border border-white/10 hover:border-white/30 px-6 py-4 rounded-xl text-sm font-medium transition-all"
                        >
                            <Copy className="w-4 h-4" />
                            {copied ? '✓ Copied!' : 'Copy Affiliate Link'}
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Commission Structure ──────────────────────────────────────── */}
            <section className="py-20 px-4 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">
                            Three ways to earn — stacked
                        </h2>
                        <p className="text-gray-400 text-lg">
                            No other trading signal affiliate pays flat + recurring + upgrade bonus.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        {COMMISSION_ROWS.map((row) => (
                            <div
                                key={row.event}
                                className={`border rounded-2xl p-6 ${row.bg} relative overflow-hidden`}
                            >
                                <div className="text-3xl mb-4">{row.icon}</div>
                                <div className={`text-3xl font-black mb-2 ${row.color}`}>
                                    {row.amount}
                                </div>
                                <div className="font-bold text-white mb-1">{row.event}</div>
                                <div className="text-sm text-gray-400">{row.timing}</div>
                            </div>
                        ))}
                    </div>

                    {/* LTV math table */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-purple-400" />
                                Affiliate Earnings Per Referral — By Plan
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Based on $10 trial flat + 20% monthly recurring. Does not include $25 annual bonus.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/[0.02]">
                                        <th className="text-left p-4 text-gray-400 font-semibold">Plan</th>
                                        <th className="text-center p-4 text-gray-400 font-semibold">Monthly Commission</th>
                                        <th className="text-center p-4 text-gray-400 font-semibold">Year 1 Total</th>
                                        <th className="text-center p-4 text-purple-400 font-semibold">Lifetime (24 mo avg)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {LTV_ROWS.map((row) => (
                                        <tr key={row.label} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4 font-medium text-white">{row.label}</td>
                                            <td className="p-4 text-center text-emerald-400 font-bold">{row.monthly}</td>
                                            <td className="p-4 text-center text-white font-bold">{row.yr1}</td>
                                            <td className="p-4 text-center text-purple-400 font-black text-base">{row.lifetime}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-3 border-t border-white/10 bg-black/20">
                            <p className="text-xs text-gray-500">
                                Lifetime = $10 flat + (20% × monthly price × 24 months). Actual earnings depend on your referral volume and subscriber retention.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Why It Converts ──────────────────────────────────────────── */}
            <section className="py-20 px-4 bg-white/[0.02] border-y border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black mb-6">
                                The easiest trading product<br />you'll ever promote.
                            </h2>
                            <div className="space-y-5">
                                {[
                                    {
                                        icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
                                        title: '$5 ask = near-zero resistance',
                                        desc: 'Asking your audience to spend $5 on a trading AI is 10× easier than $29. Most people decide in under 30 seconds.',
                                    },
                                    {
                                        icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
                                        title: 'The 2022 proof sells itself',
                                        desc: 'TQQQ lost 83%. TurboCore was down 5.1%. One stat. Paste the chart. Done.',
                                    },
                                    {
                                        icon: <Users className="w-5 h-5 text-blue-400" />,
                                        title: 'Gen Z audience — already on TikTok',
                                        desc: 'TradeMind is built for first-time investors with $1K–$10K. That\'s 80% of financial TikTok.',
                                    },
                                    {
                                        icon: <Repeat className="w-5 h-5 text-amber-400" />,
                                        title: 'Recurring = passive income',
                                        desc: 'Each referral that stays pays you every single month. 10 referrals on Bundle = $138/mo. Passive.',
                                    },
                                ].map((item) => (
                                    <div key={item.title} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm mb-1">{item.title}</div>
                                            <div className="text-sm text-gray-400 leading-relaxed">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* LTV pitch card */}
                        <div className="bg-gradient-to-br from-purple-900/30 to-black border border-purple-500/20 rounded-2xl p-8">
                            <div className="text-sm text-purple-400 font-semibold uppercase tracking-wider mb-6">
                                Your pitch to your audience
                            </div>
                            <blockquote className="text-white text-lg leading-relaxed italic border-l-2 border-purple-500 pl-5">
                                "Try TradeMind for $5. If you don't love it, cancel in 2 clicks. If you do stay — and most do — the AI rebalances your TQQQ portfolio every day at 3 PM while you live your life."
                            </blockquote>
                            <div className="mt-8 grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Entry Price', value: '$5', sub: 'trial' },
                                    { label: 'Avg Retention', value: '24 mo', sub: 'subscriber LTV' },
                                    { label: 'Your Flat Fee', value: '$10', sub: 'per trial' },
                                    { label: 'Your Recurring', value: '20%', sub: 'monthly' },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-white/5 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-black text-white">{stat.value}</div>
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{stat.label}</div>
                                        <div className="text-[10px] text-purple-400">{stat.sub}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Content Kit ──────────────────────────────────────────────── */}
            <section className="py-20 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">
                            Ready-made content — just post it
                        </h2>
                        <p className="text-gray-400 text-lg">
                            Hook scripts, data points, and platform-specific angles. Copy, customize, convert.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {HOOK_SCRIPTS.map((script) => (
                            <div
                                key={script.platform}
                                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">{script.icon}</span>
                                    <span className="font-bold text-white">{script.platform}</span>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed mb-4 italic">
                                    "{script.hook}"
                                </p>
                                <div className="flex items-center gap-2 text-xs text-purple-400 font-medium">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {script.cta}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Key data points */}
                    <div className="mt-10 bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-5 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            Key Data Points to Use in Your Content
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { stat: '-5.1%', context: 'TurboCore max drawdown in 2022 crash' },
                                { stat: '-83%', context: 'TQQQ drawdown in the same period' },
                                { stat: '-33%', context: 'QQQ drawdown in the same period' },
                                { stat: '$5K → $1M', context: 'Compounding math at age 19 → 36 at 19% CAGR' },
                                { stat: '3 PM EST', context: 'Exact time the AI signal drops every day' },
                                { stat: '$5', context: 'What it costs to try it — that\'s it' },
                            ].map((item) => (
                                <div key={item.stat} className="bg-white/5 rounded-xl px-4 py-3">
                                    <div className="text-xl font-black text-purple-400">{item.stat}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{item.context}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How It Works ─────────────────────────────────────────────── */}
            <section className="py-20 px-4 bg-white/[0.02] border-y border-white/5">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black text-center mb-14">
                        How it works
                    </h2>
                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            {
                                step: '01',
                                icon: <Share2 className="w-6 h-6 text-purple-400" />,
                                title: 'Apply & Get Link',
                                desc: 'Join on Whop, get your unique tracking link instantly. No approval wait.',
                            },
                            {
                                step: '02',
                                icon: <Users className="w-6 h-6 text-blue-400" />,
                                title: 'Share Your Way',
                                desc: 'TikTok, YouTube, Twitter, Reddit, newsletter — any channel, any format.',
                            },
                            {
                                step: '03',
                                icon: <DollarSign className="w-6 h-6 text-emerald-400" />,
                                title: 'They Pay $5',
                                desc: 'Every $5 trial signup tracked to your link triggers your $10 flat fee.',
                            },
                            {
                                step: '04',
                                icon: <Repeat className="w-6 h-6 text-amber-400" />,
                                title: 'You Get Paid Monthly',
                                desc: '20% of their subscription hits your Whop wallet every billing cycle.',
                            },
                        ].map((step, i) => (
                            <div key={step.step} className="text-center relative">
                                {i < 3 && (
                                    <div className="hidden md:block absolute top-8 left-full w-full h-[1px] bg-white/10 -translate-y-1/2 z-0" />
                                )}
                                <div className="relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                        {step.icon}
                                    </div>
                                    <div className="text-xs font-bold text-gray-500 mb-2">{step.step}</div>
                                    <div className="font-bold text-white mb-2">{step.title}</div>
                                    <div className="text-sm text-gray-400 leading-relaxed">{step.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ──────────────────────────────────────────────────────── */}
            <section className="py-20 px-4">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black text-center mb-14">
                        Frequently asked questions
                    </h2>
                    <div className="space-y-3">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className="border border-white/10 rounded-xl overflow-hidden"
                            >
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

            {/* ── CTA Footer ───────────────────────────────────────────────── */}
            <section className="py-24 px-4 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-600/10 blur-[120px]" />
                </div>
                <div className="relative max-w-2xl mx-auto">
                    <div className="text-5xl mb-6">💰</div>
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        One referral that sticks for a year<br />
                        <span className="text-purple-400">pays you $80–$175.</span>
                    </h2>
                    <p className="text-gray-400 text-xl mb-10">
                        Join the TradeMind affiliate program on Whop and start earning today.
                        No approval wait. Instant tracking link.
                    </p>
                    <a
                        href={WHOP_AFFILIATE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-3 bg-white text-black font-bold px-10 py-5 rounded-xl text-xl hover:bg-gray-100 transition-all shadow-[0_0_60px_rgba(168,85,247,0.3)]"
                    >
                        <Gift className="w-6 h-6" />
                        Join on Whop — It's Free
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <p className="text-xs text-gray-600 mt-6">
                        Payouts handled automatically by Whop. Commissions paid 30 days after each charge clears.
                    </p>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <footer className="border-t border-white/5 py-8 px-4 text-center">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-500">
                        © 2025 TradeMind.bot · Affiliate commissions are for referrals to the Whop distribution channel.
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">Terms</Link>
                        <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">Privacy</Link>
                        <Link href="/refer" className="text-gray-500 hover:text-white transition-colors">Member Referrals</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
