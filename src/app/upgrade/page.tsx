'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PRICING, creditsToBonusDays, type PlanKey } from '@/lib/pricing-config';
import { CheckCircle, Zap, Brain, Layers, Clock, ArrowRight, Star, Gift, Calendar } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Interval = 'monthly' | 'annual' | 'biennial';

interface TrialInfo {
    trialEndsAt: string | null;
    trialDays: number;
    converted: boolean;
}

// ── Plan metadata ─────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<PlanKey, React.ComponentType<any>> = {
    turbocore_pro_bundle: Brain,
    qqq_leaps:            Layers,
    full_access:          Zap,
};

const PLAN_ACCENT: Record<PlanKey, string> = {
    turbocore_pro_bundle: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
    qqq_leaps:            'from-amber-500/20 to-amber-600/5 border-amber-500/30',
    full_access:          'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
};

const PLAN_BADGE: Record<PlanKey, string | null> = {
    turbocore_pro_bundle: 'Most Popular',
    qqq_leaps:            null,
    full_access:          'Best Value',
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
    planKey, interval, trialCreditCents, isHighlighted,
}: {
    planKey: PlanKey;
    interval: Interval;
    trialCreditCents: number;
    isHighlighted: boolean;
}) {
    const plan   = PRICING.plans[planKey];
    const Icon   = PLAN_ICONS[planKey];
    const badge  = PLAN_BADGE[planKey];
    const accent = PLAN_ACCENT[planKey];

    const bonusDays = creditsToBonusDays(trialCreditCents, plan.monthly);

    const displayPrice = interval === 'annual'   ? `$${plan.annual}/yr`
                       : interval === 'biennial'  ? `$${plan.biennial}/2yr`
                       : `$${plan.monthly}/mo`;

    const subText = interval === 'annual'  ? `$${plan.annualPerMonth.toFixed(2)}/mo · 30% off`
                  : interval === 'biennial' ? `$${plan.biennialPerMonth.toFixed(2)}/mo · 40% off`
                  : null;

    const checkoutUrl = `/api/stripe/checkout?plan=${planKey}&interval=${interval}`;

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

            <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">{displayPrice}</span>
                </div>
                {subText && <p className="text-green-400 text-xs font-semibold">{subText}</p>}

                {bonusDays > 0 && interval === 'monthly' && (
                    <div className="flex items-center gap-1.5 mt-2">
                        <Gift className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400 text-xs font-semibold">
                            +{bonusDays} bonus days from your trial fee
                        </span>
                    </div>
                )}
            </div>

            <ul className="space-y-2 flex-1">
                {plan.features.map((f: string) => (
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
    { label: 'TurboCore ML Signal (daily)',   turbocore_pro_bundle: true,  qqq_leaps: false, full_access: true  },
    { label: 'SMA200 Regime Gate',            turbocore_pro_bundle: true,  qqq_leaps: false, full_access: true  },
    { label: 'Tastytrade Auto-Execution',     turbocore_pro_bundle: true,  qqq_leaps: false, full_access: true  },
    { label: 'IV-Switching (CSP/ZEBRA/CCS)',  turbocore_pro_bundle: true,  qqq_leaps: false, full_access: true  },
    { label: 'Crash Hedge (SQQQ Mode)',       turbocore_pro_bundle: true,  qqq_leaps: false, full_access: true  },
    { label: 'QQQ LEAPS ML Signal',           turbocore_pro_bundle: false, qqq_leaps: true,  full_access: true  },
    { label: 'LEAPS Position Tracking',       turbocore_pro_bundle: false, qqq_leaps: true,  full_access: true  },
    { label: 'TurboBounce Alpha',             turbocore_pro_bundle: false, qqq_leaps: false, full_access: true  },
    { label: 'Portfolio Allocation Tools',    turbocore_pro_bundle: false, qqq_leaps: false, full_access: true  },
    { label: 'Founder Office Hours',          turbocore_pro_bundle: false, qqq_leaps: false, full_access: true  },
];

function CompareTable({ interval }: { interval: Interval }) {
    const plans: PlanKey[] = ['turbocore_pro_bundle', 'qqq_leaps', 'full_access'];
    const priceLabel = (p: PlanKey) => {
        const plan = PRICING.plans[p];
        if (interval === 'annual')   return `$${plan.annual}/yr`;
        if (interval === 'biennial') return `$${plan.biennial}/2yr`;
        return `$${plan.monthly}/mo`;
    };
    return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left p-4 text-gray-400 font-medium">Feature</th>
                        {plans.map(p => (
                            <th key={p} className="text-center p-4 text-white font-semibold">
                                {PRICING.plans[p].label}
                                <div className="text-gray-400 font-normal text-xs mt-0.5">{priceLabel(p)}</div>
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
        q: 'What happens to my trial fee?',
        a: 'Your $10 or $20 trial fee is refunded as Stripe subscription credit and automatically extends your first billing period by bonus days.',
    },
    {
        q: 'How does the $100 × 4 month credit installment work?',
        a: 'When you subscribe monthly, we automatically issue $100 credit each month for the first 4 months, offsetting your bill. Net cost = plan price minus applied credit.',
    },
    {
        q: 'What is the 2-year plan?',
        a: 'The 2-year plan locks in your price for 24 months at 40% off the monthly rate. Billed as a single payment via Stripe\'s 24-month billing interval.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes. Monthly plans cancel at the end of the billing period. Annual/2-year plans are non-refundable after 14 days.',
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

function UpgradePageInner() {
    const searchParams  = useSearchParams();
    const fromTrial     = searchParams.get('from') === 'trial';
    const fromWhop      = searchParams.get('ref')  === 'whop';
    const trialDaysParam = parseInt(searchParams.get('days') ?? '30', 10);
    const trialFee       = trialDaysParam === 60 ? 20 : 10;

    const [interval, setInterval]   = useState<Interval>('monthly');
    const [trialInfo, setTrialInfo] = useState<TrialInfo>({ trialEndsAt: null, trialDays: 30, converted: false });
    const [loading, setLoading]     = useState(false);

    // Trial credit = trial fee paid (either 1000 or 2000 cents)
    const trialCreditCents = trialFee * 100;

    // Credit expiry: 7 days after trial ends
    const creditExpiry = trialInfo.trialEndsAt
        ? new Date(new Date(trialInfo.trialEndsAt).getTime() + 7 * 86400000).toISOString()
        : null;

    return (
        <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <title>TradeMind — Choose Your Plan</title>

            {/* ── Trial Banner ─────────────────────────────────────────────── */}
            {fromTrial && fromWhop && (
                <div style={{
                    background: 'linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)',
                    borderBottom: '1px solid rgba(124,58,237,0.4)',
                    padding: '16px 24px',
                    textAlign: 'center',
                }}>
                    <p style={{ margin: 0, color: '#c4b5fd', fontSize: '14px', fontWeight: 600 }}>
                        ✅ Welcome back — your account is ready.{' '}
                        <span style={{ color: '#fff' }}>
                            Your {trialDaysParam}-day trial history is saved. Your ${trialFee} trial fee
                            becomes bonus days when you pick a plan below.
                        </span>
                    </p>
                </div>
            )}

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden px-4 pt-16 pb-10 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-black" />
                <div className="relative max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-green-400 text-sm font-medium mb-6">
                        <Gift className="w-4 h-4" /> ${trialFee} trial fee converts to bonus days
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        Continue with full access.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                            Your ${trialFee} isn't gone.
                        </span>
                    </h1>

                    <p className="text-gray-400 text-lg mb-8">
                        Three strategies. One platform.
                        Pick the plan that fits — monthly, yearly (30% off), or 2-year (40% off).
                    </p>

                    {creditExpiry && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                            <p className="text-sm text-gray-400 mb-3 flex items-center justify-center gap-2">
                                <Clock className="w-4 h-4 text-orange-400" />
                                Credit expires in
                            </p>
                            <CountdownTimer endsAt={creditExpiry} />
                        </div>
                    )}
                </div>
            </section>

            {/* ── Billing Toggle ─────────────────────────────────────────────── */}
            <div className="flex justify-center gap-1 mb-10 px-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex">
                    {(['monthly', 'annual', 'biennial'] as Interval[]).map(i => (
                        <button
                            key={i}
                            onClick={() => setInterval(i)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                interval === i ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {i === 'monthly' ? 'Monthly'
                             : i === 'annual' ? (
                                <span className="flex items-center gap-2">
                                    Yearly
                                    <span className="bg-green-400/20 text-green-400 text-xs px-2 py-0.5 rounded-full font-bold">
                                        −30%
                                    </span>
                                </span>
                             ) : (
                                <span className="flex items-center gap-2">
                                    2-Year
                                    <span className="bg-amber-400/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-bold">
                                        −40%
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
                    {(['turbocore_pro_bundle', 'qqq_leaps', 'full_access'] as PlanKey[]).map(key => (
                        <PlanCard
                            key={key}
                            planKey={key}
                            interval={interval}
                            trialCreditCents={trialCreditCents}
                            isHighlighted={key === 'full_access'}
                        />
                    ))}
                </div>
            </section>

            {/* ── Credit Installment Callout ─────────────────────────────────── */}
            <section className="max-w-3xl mx-auto px-4 mb-16">
                <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 p-6 text-center">
                    <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Monthly Credit Installment</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xl mx-auto">
                        Subscribe monthly and receive <span className="text-white font-semibold">$100 credit automatically</span> for
                        your first 4 months — offsetting your bill each month. Total value: $400 applied directly
                        to your subscription.
                    </p>
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
                        { stat: '39.3%', label: 'CAGR — 3× S&P average' },
                        { stat: '86%',   label: 'Win rate — 7-year backtest' },
                        { stat: '−5.1%', label: 'Max drawdown vs TQQQ −83%' },
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

            <footer className="border-t border-white/10 py-8 text-center text-gray-500 text-xs px-4">
                <p>TradeMind · Educational analysis only · Not personalized investment advice</p>
                <p className="mt-1">Past performance does not indicate future results.</p>
            </footer>
        </div>
    );
}

export default function UpgradePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            </div>
        }>
            <UpgradePageInner />
        </Suspense>
    );
}
