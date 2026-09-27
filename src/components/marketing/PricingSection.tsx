import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePrivy } from '@privy-io/react-auth';
import { PRICING } from '@/lib/pricing-config';

/**
 * Pricing (Sep 2026 model):
 * - Signals only. Processed once per trading day at 3:30 PM ET; when a signal
 *   fires, the exact order instructions go out by email and the account's
 *   virtual portfolio mirrors the same order.
 * - Regular list prices ($360 Basic / $480 LEAPS) are the default display.
 *   Leaving an email (newsletter signup) unlocks the 30% subscriber price
 *   ($252 / $336), which is what Stripe actually charges.
 * - Trial: the card is charged at checkout; cancelling within the first
 *   month refunds the payment in full.
 */
export function PricingSection() {
    const { t } = useTranslation();
    const { login, authenticated } = usePrivy();
    const [selectedTier, setSelectedTier] = useState<string>('qqq_leaps');

    // Newsletter-unlock state: email field, submit status, discounted view.
    const [nlEmail, setNlEmail] = useState('');
    const [nlBusy, setNlBusy] = useState(false);
    const [nlError, setNlError] = useState<string | null>(null);
    const [unlocked, setUnlocked] = useState(false);

    // Arriving from the newsletter claim button: ?email=... pre-unlocks the
    // subscriber price view (verified against eligibility when possible).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const email = params.get('email');
        if (!email || !email.includes('@')) return;
        setNlEmail(email);
        fetch(`/api/newsletter/eligibility?email=${encodeURIComponent(email)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((d) => {
                if (d && d.state && d.state !== 'not-found') setUnlocked(true);
                else setUnlocked(true); // recipient addresses all carry the offer
            })
            .catch(() => setUnlocked(true));
    }, []);

    const basic = PRICING.plans.turbocore_pro_bundle;
    const leaps = PRICING.plans.qqq_leaps;

    const TIERS = useMemo(() => [
        {
            id: 'qqq_basic',
            plan: 'basic' as const,
            name: basic.label,
            tagline: t('pricing.turbocore.tagline'),
            regular: basic.regularAnnual,
            price: basic.annual,
            perMonth: basic.annualPerMonth,
            description: basic.description,
            features: basic.features as unknown as string[],
            permissionNote: 'No options approval needed. Any brokerage account works.',
            button: 'Start QQQ Basic',
            popular: false,
            accentColor: '#4f8ef7',
        },
        {
            id: 'qqq_leaps',
            plan: 'leaps' as const,
            name: leaps.label,
            tagline: t('pricing.qqq_leaps.tagline', 'ML-powered long-term options on QQQ'),
            regular: leaps.regularAnnual,
            price: leaps.annual,
            perMonth: leaps.annualPerMonth,
            description: leaps.description,
            features: leaps.features as unknown as string[],
            permissionNote: 'Requires options approval at your broker (long calls).',
            button: 'Start QQQ LEAPS',
            popular: true,
            accentColor: '#7c3aed',
        }
    ], [t, basic, leaps]);

    const unlockRef = useRef<HTMLDivElement>(null);
    const [pendingPlan, setPendingPlan] = useState<'basic' | 'leaps' | null>(null);

    // Popup modal state. At the regular (non-subscriber) price, Start opens
    // the subscribe popup: enter an email, we subscribe instantly (no confirm
    // step) and email the first issue right away. A "continue at regular
    // price" escape hatch stays on the popup.
    const [nlModalOpen, setNlModalOpen] = useState(false);
    const [nlModalSent, setNlModalSent] = useState(false);

    const handleSubscribe = async (plan: 'basic' | 'leaps') => {
        if (!unlocked) {
            setPendingPlan(plan);
            setNlModalSent(false);
            setNlModalOpen(true);
            return;
        }
        if (!authenticated) {
            login(nlEmail.includes('@') ? { prefill: { type: 'email', value: nlEmail } } : {});
            return;
        }
        window.location.href = `/upgrade?plan=${plan}${nlEmail ? `&email=${encodeURIComponent(nlEmail)}` : ''}`;
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = nlEmail.trim();
        if (nlBusy || !email.includes('@')) return;
        setNlBusy(true);
        setNlError(null);
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, consent: true, source: 'pricing', instant: true }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || 'Subscription failed');
            setUnlocked(true);
            setNlModalSent(true);
        } catch (err) {
            setNlError(err instanceof Error ? err.message : 'Subscription failed');
        } finally {
            setNlBusy(false);
        }
    };

    const getCardClasses = (tier: typeof TIERS[0]) => {
        const isSelected = selectedTier === tier.id;
        const base = 'relative flex flex-col p-8 rounded-2xl border transition-all duration-300 cursor-pointer select-none';
        if (tier.popular) {
            if (isSelected) {
                return `${base} border-tm-purple bg-tm-purple/10 shadow-[0_0_50px_rgba(124,58,237,0.4)] -translate-y-1`;
            }
            return `${base} border-tm-purple/60 bg-tm-purple/5 shadow-[0_0_30px_rgba(124,58,237,0.15)] hover:shadow-[0_0_50px_rgba(124,58,237,0.35)] hover:border-tm-purple hover:-translate-y-1`;
        }
        if (isSelected) {
            return `${base} border-[#4f8ef7] bg-[#4f8ef7]/10 shadow-[0_0_45px_rgba(79,142,247,0.35)] -translate-y-1`;
        }
        return `${base} border-white/10 bg-tm-card/50 hover:border-[#4f8ef7]/60 hover:shadow-[0_0_40px_rgba(79,142,247,0.2)] hover:bg-white/5 hover:-translate-y-1`;
    };

    return (
        <section className="w-full max-w-7xl mx-auto py-10 px-6 relative z-10" id="pricing">
            <div className="text-center mb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('pricing.title')} {t('pricing.subtitle')}</h2>

                {/* What you actually get: signals by email, orders placed by you */}
                <p className="text-sm text-gray-300 leading-relaxed max-w-3xl mx-auto">
                    TradeMind is a signal service, not auto-trading. Every trading day we process the
                    signal at 3:30 PM ET and email you the exact order instructions to enter at your own
                    broker. Your TradeMind virtual account mirrors each order so your record matches the signal.
                </p>

                <div className="mt-5 inline-flex items-center gap-3 bg-tm-green/10 px-5 py-2.5 rounded-full border border-tm-green/30 mx-auto">
                    <span className="text-sm font-bold text-tm-green">First month free: no charge until day 30, turn off auto renew any time</span>
                </div>
                <p className="mt-3 text-xs text-tm-purple/80 font-semibold tracking-wider uppercase">
                    {t('pricing.annual_only', 'Annual billing only')} · card charged at checkout
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-3xl mx-auto">
                {TIERS.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                        <div
                            key={tier.id}
                            className={getCardClasses(tier)}
                            onClick={() => setSelectedTier(tier.id)}
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-tm-purple to-[#9d63f5] text-white text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full flex items-center gap-1 shadow-lg shadow-tm-purple/30">
                                    <Star className="w-3 h-3 fill-current" /> {t('pricing.popular')}
                                </div>
                            )}
                            {isSelected && !tier.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4f8ef7] text-white text-[10px] font-bold uppercase tracking-widest py-0.5 px-3 rounded-full">
                                    ✓ Selected
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                            <p className={`text-xs italic mb-2 font-medium ${tier.popular ? 'text-tm-purple/80' : 'text-[#4f8ef7]/80'}`}>{tier.tagline}</p>
                            <p className="text-sm text-tm-muted mb-4 leading-relaxed">{tier.description}</p>

                            <div className="flex flex-col mb-5">
                                {unlocked ? (
                                    <>
                                        <div className="flex items-end gap-2 mb-1">
                                            <span className="text-tm-muted text-lg line-through">${tier.regular}</span>
                                            <span className="text-4xl font-bold text-white">${tier.price}</span>
                                            <span className="text-tm-muted text-sm mb-1">{t('pricing.per_year', '/yr')}</span>
                                        </div>
                                        <span className="text-xs text-tm-muted">{t('pricing.billed_annually', 'Billed annually')}</span>
                                        <span className="mt-2 text-xs font-bold text-tm-green py-1 px-2 bg-tm-green/10 rounded-md w-fit">
                                            Newsletter subscriber price: 30% off (${tier.perMonth}/mo equivalent)
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-end gap-1 mb-1">
                                            <span className="text-4xl font-bold text-white">${tier.regular}</span>
                                            <span className="text-tm-muted text-sm mb-1">{t('pricing.per_year', '/yr')}</span>
                                        </div>
                                        <span className="text-xs text-tm-muted">{t('pricing.billed_annually', 'Billed annually')}</span>
                                    </>
                                )}
                            </div>

                            <ul className="flex flex-col gap-2.5 mb-4 flex-grow">
                                {(Array.isArray(tier.features) ? tier.features : []).map((feat, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${tier.popular || isSelected ? 'text-tm-purple' : 'text-tm-green'}`} />
                                        <span className="text-sm text-gray-300">{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <p className={`text-xs mb-3 font-semibold ${tier.popular ? 'text-tm-purple/90' : 'text-[#4f8ef7]/90'}`}>
                                {tier.permissionNote}
                            </p>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleSubscribe(tier.plan); }}
                                className={`w-full py-3 rounded-xl font-bold transition-all ${
                                    tier.popular
                                        ? 'bg-tm-purple hover:bg-tm-purple/90 text-white shadow-lg shadow-tm-purple/25'
                                        : isSelected
                                            ? 'bg-[#4f8ef7] hover:bg-[#4f8ef7]/90 text-white shadow-lg shadow-[#4f8ef7]/25'
                                            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                                }`}
                            >
                                {tier.button}
                            </button>
                        </div>
                    );
                })}
            </div>

            {unlocked && (
                <p className="mt-6 text-center text-xs text-tm-green font-semibold tracking-wider uppercase">
                    Subscriber price unlocked for {nlEmail || 'your email'}: 30% off your first annual term
                </p>
            )}

            {/* Newsletter subscribe popup. Opened by the Start buttons while the
                regular price is showing. */}
            {nlModalOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
                    onClick={() => setNlModalOpen(false)}
                >
                    <div
                        ref={unlockRef}
                        className="w-full max-w-md rounded-2xl border border-tm-purple/40 bg-[#14141f] p-6 text-center shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {!nlModalSent ? (
                            <>
                                <p className="text-base font-bold text-white mb-1">Subscribers pay 30% less</p>
                                <p className="text-xs text-tm-muted mb-4">
                                    Enter your email to subscribe to The AI Systematic Investor newsletter. The first
                                    issue arrives right away and the subscriber price ($252 QQQ Basic, $336 QQQ LEAPS)
                                    applies to your first annual term automatically.
                                </p>
                                <form onSubmit={handleUnlock} className="flex flex-col gap-3">
                                    <input
                                        type="email"
                                        required
                                        autoFocus
                                        value={nlEmail}
                                        onChange={(e) => setNlEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-tm-muted focus:outline-none focus:border-tm-purple"
                                    />
                                    <button
                                        type="submit"
                                        disabled={nlBusy}
                                        className="w-full rounded-lg bg-tm-purple px-5 py-3 text-sm font-bold text-white hover:bg-tm-purple/90 disabled:opacity-60"
                                    >
                                        {nlBusy ? 'Subscribing...' : 'Subscribe and unlock 30% off'}
                                    </button>
                                </form>
                                {nlError && <p className="mt-3 text-xs text-tm-red">{nlError}</p>}
                                <p className="mt-3 text-[11px] text-tm-muted">
                                    By subscribing you agree to receive the newsletter. Unsubscribe anytime.
                                </p>
                                {pendingPlan && (
                                    <button
                                        onClick={() => {
                                            const plan = pendingPlan;
                                            setPendingPlan(null);
                                            setNlModalOpen(false);
                                            if (!authenticated) login(nlEmail.includes('@') ? { prefill: { type: 'email', value: nlEmail } } : {});
                                            else window.location.href = `/upgrade?plan=${plan}`;
                                        }}
                                        className="mt-3 text-[11px] text-tm-muted underline hover:text-white"
                                    >
                                        No thanks, continue {pendingPlan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Basic'} at the regular ${pendingPlan === 'leaps' ? 480 : 360} price
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="text-base font-bold text-tm-green mb-1">Check your email</p>
                                <p className="text-xs text-tm-muted mb-4">
                                    You are subscribed. The first issue of The AI Systematic Investor is on its way
                                    to {nlEmail}. Your 30% subscriber price is unlocked.
                                </p>
                                {pendingPlan && (
                                    <button
                                        onClick={() => {
                                            const plan = pendingPlan;
                                            setPendingPlan(null);
                                            setNlModalOpen(false);
                                            if (!authenticated) login({ prefill: { type: 'email', value: nlEmail } });
                                            else window.location.href = `/upgrade?plan=${plan}&email=${encodeURIComponent(nlEmail)}`;
                                        }}
                                        className="w-full rounded-lg bg-tm-purple px-5 py-3 text-sm font-bold text-white hover:bg-tm-purple/90"
                                    >
                                        Continue with {pendingPlan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Basic'} at the subscriber price
                                    </button>
                                )}
                                <button
                                    onClick={() => setNlModalOpen(false)}
                                    className="mt-3 text-[11px] text-tm-muted underline hover:text-white"
                                >
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
