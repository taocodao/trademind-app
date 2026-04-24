'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PRICING, priceAfterTrialCredit, type PlanKey } from '@/lib/pricing-config';
import { CheckCircle, Zap, Brain, Layers, Clock, ArrowRight, Star } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Interval = 'monthly' | 'annual';

interface TrialInfo {
    trialEndsAt: string | null;
    converted: boolean;
}

// ── Plan metadata for rendering ───────────────────────────────────────────────

const PLAN_ICONS: Record<PlanKey, React.ComponentType<any>> = {
    turbocore:     Brain,
    turbocore_pro: Zap,
    both_bundle:   Layers,
};

const PLAN_ACCENT: Record<PlanKey, string> = {
    turbocore:     'from-purple-500/20 to-purple-600/5 border-purple-500/30',
    turbocore_pro: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/30',
    both_bundle:   'from-amber-500/20 to-amber-600/5 border-amber-500/30',
};

const PLAN_BADGE: Record<PlanKey, string | null> = {
    turbocore:     null,
    turbocore_pro: 'Most Popular',
    both_bundle:   'Best Value',
};

// ── Countdown Timer ───────────────────────────────────────────────────────────

function CountdownTimer({ endsAt }: { endsAt: string }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

    useEffect(() => {
        const target = new Date(endsAt).getTime();
        const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 }); return; }
            setTimeLeft({
                days:  Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                mins:  Math.floor((diff % 3600000)  / 60000),
                secs:  Math.floor((diff % 60000)    / 1000),
            });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [endsAt]);

    const pad = (n: number) => String(n).padStart(2, '0');

    return (
        <div className="flex items-center gap-3 justify-center">
            {[
                { label: 'Days',  val: timeLeft.days },
                { label: 'Hours', val: timeLeft.hours },
                { label: 'Mins',  val: timeLeft.mins },
                { label: 'Secs',  val: timeLeft.secs },
            ].map(({ label, val }) => (
                <div key={label} className="flex flex-col items-center">
                    <div className="bg-white/10 rounded-lg px-3 py-2 min-w-[52px] text-center">
                        <span className="text-2xl font-mono font-bold text-white">{pad(val)}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{label}</span>
                </div>
            ))}
        </div>
    );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({
    planKey, interval, creditAmount, isHighlighted,
}: {
    planKey: PlanKey;
    interval: Interval;
    creditAmount: number;
    isHighlighted: boolean;
}) {
    const plan   = PRICING.plans[planKey];
    const Icon   = PLAN_ICONS[planKey];
    const badge  = PLAN_BADGE[planKey];
    const accent = PLAN_ACCENT[planKey];
    const creditDollars = creditAmount / 100;

    const basePrice   = interval === 'annual' ? plan.annual : plan.monthly;
    const afterCredit = basePrice - creditDollars;
    const isAnnual    = interval === 'annual';
    const bogoLabel   = isAnnual ? '+ Year 2 Free' : null;

    const checkoutUrl = `/api/stripe/checkout?plan=${planKey}&interval=${interval}&promo=${PRICING.trial.promoCode}`;

    return (
        <div className={`
            relative rounded-2xl border bg-gradient-to-b p-6 flex flex-col gap-4 transition-all
            ${accent}
            ${isHighlighted ? 'scale-105 shadow-2xl shadow-indigo-500/20 ring-1 ring-indigo-500/40' : ''}
        `}>
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {badge}
                    </span>
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg text-white">{plan.label}</h3>
            </div>

            {/* Pricing */}
            <div className="space-y-1">
                {creditAmount > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 line-through text-sm">${basePrice}{isAnnual ? '/yr' : '/mo'}</span>
                        <span className="text-green-400 text-xs font-semibold bg-green-400/10 px-2 py-0.5 rounded-full">
                            −${creditDollars} trial credit
                        </span>
                    </div>
                )}
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">${afterCredit.toFixed(0)}</span>
                    <span className="text-gray-400 text-sm">{isAnnual ? '/yr' : ' first month'}</span>
                </div>
                {!isAnnual && (
                    <p className="text-gray-500 text-xs">then ${plan.monthly}/mo</p>
                )}
                {bogoLabel && (
                    <div className="flex items-center gap-1.5 mt-1">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-400 text-xs font-semibold">{bogoLabel}</span>
                    </div>
                )}
                {isAnnual && (
                    <p className="text-gray-500 text-xs">${plan.annualPerMonth.toFixed(2)}/mo effective</p>
                )}
            </div>

            {/* Features */}
            <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        {f}
                    </li>
                ))}
            </ul>

            <a
                href={checkoutUrl}
                className={`
                    flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm transition-all
                    ${isHighlighted
                        ? 'bg-white text-black hover:bg-gray-100'
                        : 'bg-white/10 text-white hover:bg-white/20'}
                `}
            >
                Get Started <ArrowRight className="w-4 h-4" />
            </a>
        </div>
    );
}

// ── Comparison Table ──────────────────────────────────────────────────────────

const COMPARE_FEATURES = [
    { label: 'TurboCore ML Signal',        turbocore: true,  turbocore_pro: true,  both_bundle: true  },
    { label: 'SMA200 Gate',                turbocore: true,  turbocore_pro: true,  both_bundle: true  },
    { label: 'Tastytrade Auto-Execution',  turbocore: true,  turbocore_pro: true,  both_bundle: true  },
    { label: 'Enhanced ML Regime',         turbocore: false, turbocore_pro: true,  both_bundle: true  },
    { label: 'VIX Positioning',            turbocore: false, turbocore_pro: true,  both_bundle: true  },
    { label: 'QQQ LEAPS Strategy',         turbocore: false, turbocore_pro: true,  both_bundle: true  },
    { label: 'Early Signal Access',        turbocore: false, turbocore_pro: true,  both_bundle: true  },
    { label: 'TurboBounce Alpha',          turbocore: false, turbocore_pro: false, both_bundle: true  },
    { label: 'Portfolio Allocation Tools', turbocore: false, turbocore_pro: false, both_bundle: true  },
    { label: 'Founder Office Hours',       turbocore: false, turbocore_pro: false, both_bundle: true  },
];

function CompareTable({ interval }: { interval: Interval }) {
    const plans: PlanKey[] = ['turbocore', 'turbocore_pro', 'both_bundle'];
    return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left p-4 text-gray-400 font-medium">Feature</th>
                        {plans.map(p => (
                            <th key={p} className="text-center p-4 text-white font-semibold">
                                {PRICING.plans[p].label}
                                <div className="text-gray-400 font-normal text-xs mt-0.5">
                                    ${interval === 'annual' ? PRICING.plans[p].annual + '/yr' : PRICING.plans[p].monthly + '/mo'}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {COMPARE_FEATURES.map((row, i) => (
                        <tr key={row.label} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/2'}`}>
                            <td className="p-4 text-gray-300">{row.label}</td>
                            {plans.map(p => (
                                <td key={p} className="text-center p-4">
                                    {(row as any)[p]
                                        ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                                        : <span className="text-gray-600">—</span>}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
    {
        q: 'What happens to my trial data?',
        a: 'Your signal history, virtual portfolio, and performance data carry over automatically when you subscribe — nothing is lost.',
    },
    {
        q: 'Does the $15 credit expire?',
        a: `Yes — the credit expires ${PRICING.trial.promoExpireDays} days after your trial ends. Enter code ${PRICING.trial.promoCode} at checkout before the timer hits zero.`,
    },
    {
        q: 'What is the BOGO offer?',
        a: 'When you choose annual billing, you get a second year free. You pay once, you are locked in at today\'s price for two full years.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes. Monthly plans cancel at the end of the billing period. Annual plans are non-refundable after 14 days.',
    },
    {
        q: 'Do I need a Tastytrade account?',
        a: 'No — you can use TradeMind in Track Only mode to monitor signals and P&L without executing real trades.',
    },
];

function FAQSection() {
    const [open, setOpen] = useState<number | null>(null);
    return (
        <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                    <button
                        className="w-full flex items-center justify-between p-4 text-left text-white font-medium hover:bg-white/5 transition-colors"
                        onClick={() => setOpen(open === i ? null : i)}
                    >
                        {item.q}
                        <span className="text-gray-400 ml-4">{open === i ? '−' : '+'}</span>
                    </button>
                    {open === i && (
                        <div className="px-4 pb-4 text-gray-400 text-sm leading-relaxed">{item.a}</div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UpgradePage() {
    const searchParams = useSearchParams();
    const userId       = searchParams.get('user') ?? '';

    const [interval, setInterval]   = useState<Interval>('monthly');
    const [trialInfo, setTrialInfo] = useState<TrialInfo>({ trialEndsAt: null, converted: false });
    const [loading, setLoading]     = useState(true);
    const creditAmount               = PRICING.trial.creditAmount; // always show $15 credit

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        fetch(`/api/whop/trial-status?user=${userId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => d && setTrialInfo({ trialEndsAt: d.trialEndsAt, converted: d.converted }))
            .finally(() => setLoading(false));
    }, [userId]);

    // Figure out credit expiry for urgency copy
    const creditExpiry = trialInfo.trialEndsAt
        ? new Date(new Date(trialInfo.trialEndsAt).getTime() + PRICING.trial.promoExpireDays * 86400000).toISOString()
        : null;

    return (
        <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {/* Meta */}
            <title>TradeMind — Upgrade Your Plan</title>

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden px-4 pt-16 pb-10 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-black" />
                <div className="relative max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-green-400 text-sm font-medium mb-6">
                        <CheckCircle className="w-4 h-4" /> Your $15 trial credit is waiting
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        Your trial is ending.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                            Your $15 isn't gone.
                        </span>
                    </h1>

                    <p className="text-gray-400 text-lg mb-8">
                        Apply your trial credit at checkout — your first month starts at <strong className="text-white">$14</strong>.
                    </p>

                    {/* Countdown */}
                    {creditExpiry && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                            <p className="text-sm text-gray-400 mb-3 flex items-center justify-center gap-2">
                                <Clock className="w-4 h-4 text-orange-400" />
                                Credit expires in
                            </p>
                            <CountdownTimer endsAt={creditExpiry} />
                        </div>
                    )}

                    {!loading && !trialInfo.trialEndsAt && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-sm text-gray-400">
                            Use code <code className="text-white font-mono bg-white/10 px-2 py-0.5 rounded">{PRICING.trial.promoCode}</code> at checkout to apply your $15 credit.
                        </div>
                    )}
                </div>
            </section>

            {/* ── Billing Toggle ─────────────────────────────────────────────── */}
            <div className="flex justify-center gap-1 mb-10 px-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex">
                    {(['monthly', 'annual'] as Interval[]).map(i => (
                        <button
                            key={i}
                            onClick={() => setInterval(i)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                                interval === i ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {i === 'monthly' ? 'Monthly' : (
                                <span className="flex items-center gap-2">
                                    Annual
                                    <span className="bg-amber-400/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-bold">
                                        BOGO
                                    </span>
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Plan Cards ─────────────────────────────────────────────────── */}
            <section className="max-w-5xl mx-auto px-4 mb-16">
                <div className="grid md:grid-cols-3 gap-6 items-start">
                    {(['turbocore', 'turbocore_pro', 'both_bundle'] as PlanKey[]).map(key => (
                        <PlanCard
                            key={key}
                            planKey={key}
                            interval={interval}
                            creditAmount={creditAmount}
                            isHighlighted={key === 'turbocore_pro'}
                        />
                    ))}
                </div>
            </section>

            {/* ── Comparison Table ───────────────────────────────────────────── */}
            <section className="max-w-4xl mx-auto px-4 mb-16">
                <h2 className="text-xl font-bold text-center mb-6">Compare Plans</h2>
                <CompareTable interval={interval} />
            </section>

            {/* ── Social Proof ───────────────────────────────────────────────── */}
            <section className="max-w-4xl mx-auto px-4 mb-16">
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        { stat: '27.8%', label: 'CAGR backtested on TQQQ (2017–2024)' },
                        { stat: '−5.1%', label: 'Max drawdown in 2022 vs TQQQ −83%' },
                        { stat: '3 PM ET', label: 'Daily signal, every market day' },
                    ].map(({ stat, label }) => (
                        <div key={stat} className="text-center bg-white/5 border border-white/10 rounded-xl p-5">
                            <p className="text-3xl font-extrabold text-white mb-1">{stat}</p>
                            <p className="text-gray-400 text-sm">{label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FAQ ────────────────────────────────────────────────────────── */}
            <section className="max-w-2xl mx-auto px-4 mb-20">
                <h2 className="text-xl font-bold text-center mb-6">Frequently Asked Questions</h2>
                <FAQSection />
            </section>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer className="border-t border-white/10 py-8 text-center text-gray-500 text-xs px-4">
                <p>TradeMind · Educational analysis only · Not personalized investment advice</p>
                <p className="mt-1">Past performance does not indicate future results.</p>
            </footer>
        </div>
    );
}
