'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, CheckCircle, Star, Clock, ExternalLink, Crown, AlertTriangle, RefreshCw, Zap, Layers, TrendingUp } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

// ── Tier display labels ─────────────────────────────────────────────────────
const TIER_LABELS: Record<string, string> = {
    observer:            'Observer (Free)',
    turbocore:           'TurboCore',
    turbocore_pro:       'TurboCore Pro',
    turbocore_pro_bundle:'Turbo Core + Pro',
    qqq_leaps:           'QQQ LEAPS',
    full_access:         'Full Access',
    both_bundle:         'Full Access',       // legacy alias
};

// ── Post-trial plan definitions ─────────────────────────────────────────────
const POST_TRIAL_PLANS = [
    {
        id:          'turbocore_pro_bundle',
        name:        'Turbo Core + Pro',
        icon:        Zap,
        description: 'TurboCore ML Signal (daily 3 PM ET) + IV-Switching Composite Options Strategy',
        monthly:     69,
        annual:      Math.round(69 * 12 * 0.70),   // 30% off
        biennial:    Math.round(69 * 24 * 0.60),    // 40% off
        color:       'from-purple-500 to-indigo-500',
        monthlyPriceId:  process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_PRO_BUNDLE_MONTHLY_PRICE_ID  || '',
        annualPriceId:   process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_PRO_BUNDLE_ANNUAL_PRICE_ID   || '',
        biennialPriceId: process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_PRO_BUNDLE_BIENNIAL_PRICE_ID || '',
    },
    {
        id:          'qqq_leaps',
        name:        'QQQ LEAPS',
        icon:        TrendingUp,
        description: 'ML-Powered QQQ Long-Term Options — ENTER / EXIT / HOLD signals',
        monthly:     59,
        annual:      Math.round(59 * 12 * 0.70),
        biennial:    Math.round(59 * 24 * 0.60),
        color:       'from-blue-500 to-cyan-500',
        monthlyPriceId:  process.env.NEXT_PUBLIC_STRIPE_QQQ_LEAPS_MONTHLY_PRICE_ID  || '',
        annualPriceId:   process.env.NEXT_PUBLIC_STRIPE_QQQ_LEAPS_ANNUAL_PRICE_ID   || '',
        biennialPriceId: process.env.NEXT_PUBLIC_STRIPE_QQQ_LEAPS_BIENNIAL_PRICE_ID || '',
    },
    {
        id:          'full_access',
        name:        'Full Access',
        icon:        Layers,
        description: 'All 3 strategies: TurboCore + Turbo Pro + QQQ LEAPS — everything included',
        monthly:     100,
        annual:      Math.round(100 * 12 * 0.70),
        biennial:    Math.round(100 * 24 * 0.60),
        color:       'from-pink-500 to-rose-500',
        recommended: true,
        monthlyPriceId:  process.env.NEXT_PUBLIC_STRIPE_FULL_ACCESS_MONTHLY_PRICE_ID  || '',
        annualPriceId:   process.env.NEXT_PUBLIC_STRIPE_FULL_ACCESS_ANNUAL_PRICE_ID   || '',
        biennialPriceId: process.env.NEXT_PUBLIC_STRIPE_FULL_ACCESS_BIENNIAL_PRICE_ID || '',
    },
];

type Interval = 'monthly' | 'annual' | 'biennial';

interface MembershipInfo {
    tier:               string;
    status:             string | null;
    billingInterval:    string | null;
    currentPeriodEnd:   string | null;
    trialEnd:           string | null;
    priceId:            string | null;
    cancelAtPeriodEnd?: boolean;
    cancelAt?:          string | null;
    appTrialStatus?:    string | null;
    appTrialEnd?:       string | null;
    appTrialTier?:      string | null;
    billingSource?:     string | null;
    trialDaysTotal?:    number;
}

export function SubscriptionManager() {
    const { getAccessToken, user } = usePrivy();

    // Extract email from Privy user object — works for email/OTP, Google, Apple OAuth.
    // This is passed as X-User-Email to the tier API so the server can sync it
    // into user_settings without relying on JWT claims (access tokens lack email).
    const privyUserEmail: string =
        (user as any)?.email?.address ||
        (user?.linkedAccounts?.find((a: any) => a.type === 'email') as any)?.address ||
        (user?.linkedAccounts?.find((a: any) => a.type === 'google_oauth') as any)?.email ||
        (user?.linkedAccounts?.find((a: any) => a.type === 'apple_oauth') as any)?.email ||
        '';
    const searchParams       = useSearchParams();
    const isMockExpired      = searchParams?.get('mockExpired') === 'true';

    const [interval,         setInterval]         = useState<Interval>('annual');
    const [membership,       setMembership]        = useState<MembershipInfo>({
        tier: 'observer', status: null, billingInterval: null,
        currentPeriodEnd: null, trialEnd: null, priceId: null,
    });
    const [loading,          setLoading]           = useState<string | null>(null);
    const [portalLoading,    setPortalLoading]     = useState(false);
    const [showCancelModal,  setShowCancelModal]   = useState(false);
    const [cancelLoading,    setCancelLoading]     = useState(false);
    const [cancelError,      setCancelError]       = useState<string | null>(null);
    const [reactivateLoading,setReactivateLoading] = useState(false);

    const refreshMembership = async () => {
        const token = await getAccessToken();
        const extraHeaders: Record<string, string> = {};
        if (token) extraHeaders['Authorization'] = `Bearer ${token}`;
        if (privyUserEmail) extraHeaders['X-User-Email'] = privyUserEmail;
        const res   = await fetch('/api/settings/tier', { headers: extraHeaders });
        const d = await res.json();
        if (d.tier) setMembership(d);
    };

    useEffect(() => { refreshMembership(); }, []);

    // ── Derived state ──────────────────────────────────────────────────────
    const isWhopTrial   = membership.billingSource === 'whop' && membership.status === 'active';
    const trialActive   = isMockExpired ? false
        : isWhopTrial
        || membership.appTrialStatus === 'active'
        || membership.appTrialStatus === 'second_trial_active';
    const trialExpired  = isMockExpired || membership.appTrialStatus === 'expired'
        || (membership.billingSource === 'whop' && membership.status === 'canceled');
    const isSubscribed  = ['active','trialing','past_due'].includes(membership.status || '')
        && membership.priceId !== null;

    const trialEnd      = isWhopTrial ? membership.trialEnd : membership.appTrialEnd;
    const daysLeft      = trialEnd
        ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000))
        : 0;
    const trialDaysTotal = membership.trialDaysTotal || 30;
    const trialNum      = membership.appTrialStatus === 'second_trial_active' ? 2 : 1;

    const renewalDate   = membership.currentPeriodEnd
        ? new Date(membership.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleCheckout = async (priceId: string) => {
        if (!priceId) { alert('Plan not yet configured — check back soon.'); return; }
        setLoading(priceId);
        try {
            const token = await getAccessToken();
            const res   = await fetch('/api/stripe/checkout', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body:    JSON.stringify({ priceId, isAnnual: interval !== 'monthly' }),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else throw new Error(data.error);
        } catch { alert('Failed to initiate checkout.'); }
        finally  { setLoading(null); }
    };

    const handlePortal = async () => {
        setPortalLoading(true);
        try {
            const token = await getAccessToken();
            const res   = await fetch('/api/stripe/portal', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body:    JSON.stringify({}),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch { alert('Failed to open billing portal.'); }
        finally  { setPortalLoading(false); }
    };

    const handleCancelConfirm = async () => {
        setCancelLoading(true); setCancelError(null);
        try {
            const token = await getAccessToken();
            const res   = await fetch('/api/stripe/cancel', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
            const data  = await res.json();
            if (!res.ok) throw new Error(data.error || 'Cancellation failed');
            setShowCancelModal(false);
            await refreshMembership();
        } catch (err: any) { setCancelError(err.message); }
        finally { setCancelLoading(false); }
    };

    const handleReactivate = async () => {
        setReactivateLoading(true);
        try {
            const res = await fetch('/api/stripe/cancel', { method: 'PUT' });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            await refreshMembership();
        } catch { /* silent */ }
        finally { setReactivateLoading(false); }
    };

    const getPriceId = (plan: typeof POST_TRIAL_PLANS[0]) =>
        interval === 'monthly'  ? plan.monthlyPriceId  :
        interval === 'annual'   ? plan.annualPriceId   :
                                  plan.biennialPriceId;

    const displayPrice = (plan: typeof POST_TRIAL_PLANS[0]) => {
        if (interval === 'monthly')  return { mo: plan.monthly,                            total: null };
        if (interval === 'annual')   return { mo: Math.round(plan.annual  / 12),           total: plan.annual  };
        return                               { mo: Math.round(plan.biennial / 24),          total: plan.biennial };
    };

    // ── Render: Active Trial ───────────────────────────────────────────────
    const ActiveTrialBanner = trialActive ? (
        <div className="mb-4 rounded-xl p-3 flex items-center gap-3 border border-tm-purple/30 bg-gradient-to-r from-tm-purple/10 to-blue-500/10">
            <div className="w-8 h-8 rounded-full bg-tm-purple/20 flex items-center justify-center shrink-0">
                <span className="text-sm">🎉</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">
                    {isWhopTrial
                        ? `Whop Trial — Full Access (${trialDaysTotal} days)`
                        : `Free Trial #${trialNum} — Full Access`}
                </p>
                <p className="text-[10px] text-tm-muted">
                    {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining · No credit card needed yet` : 'Expires today!'}
                </p>
            </div>
            <a href="/upgrade" className="text-[10px] font-bold text-tm-purple hover:underline whitespace-nowrap shrink-0">
                View Plans →
            </a>
        </div>
    ) : null;

    // ── Render: Expired Trial → show post-trial plan cards ─────────────────
    const ExpiredTrialSection = (trialExpired || isMockExpired) && !isSubscribed ? (
        <div className="mt-2">
            <div className="rounded-xl p-4 mb-5 border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 flex items-start gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                    <p className="text-sm font-bold text-white">Your Trial Has Ended</p>
                    <p className="text-[11px] text-tm-muted mt-0.5">
                        Your {trialDaysTotal}-day Full Access trial is complete. Choose a plan below to keep trading with AI-powered signals.
                        Your trial fee is converted to bonus subscription days.
                    </p>
                </div>
            </div>

            {/* Billing interval toggle */}
            <div className="flex items-center justify-center gap-1 mb-5">
                {(['monthly','annual','biennial'] as Interval[]).map(iv => (
                    <button
                        key={iv}
                        onClick={() => setInterval(iv)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                            interval === iv
                                ? 'bg-tm-purple text-white shadow-md'
                                : 'bg-white/5 text-tm-muted hover:bg-white/10'
                        }`}
                    >
                        {iv === 'monthly'  ? 'Monthly'        :
                         iv === 'annual'   ? 'Yearly (30% off)' :
                                            '2 Years (40% off)'}
                    </button>
                ))}
            </div>

            {/* Plan cards */}
            <div className="space-y-3">
                {POST_TRIAL_PLANS.map(plan => {
                    const { mo, total } = displayPrice(plan);
                    const pid = getPriceId(plan);
                    const Icon = plan.icon;
                    return (
                        <div
                            key={plan.id}
                            className={`relative rounded-xl p-4 border transition-all ${
                                plan.recommended
                                    ? 'border-pink-500/40 bg-gradient-to-br from-pink-500/10 to-rose-500/5 shadow-lg shadow-pink-500/10'
                                    : 'border-white/10 bg-white/3 hover:border-white/20'
                            }`}
                        >
                            {plan.recommended && (
                                <span className="absolute -top-2.5 left-4 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-pink-500 to-rose-500 text-white px-2.5 py-0.5 rounded-full shadow">
                                    Best Value
                                </span>
                            )}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center shrink-0`}>
                                        <Icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white">{plan.name}</p>
                                        <p className="text-[10px] text-tm-muted leading-snug max-w-[200px]">{plan.description}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg font-black text-white">${mo}<span className="text-[11px] text-tm-muted font-normal">/mo</span></p>
                                    {total && <p className="text-[10px] text-tm-muted">${total} billed {interval === 'annual' ? 'annually' : 'every 2 years'}</p>}
                                </div>
                            </div>
                            <button
                                onClick={() => handleCheckout(pid)}
                                disabled={loading === pid}
                                className={`mt-3 w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                    plan.recommended
                                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-90 shadow-lg shadow-pink-500/20'
                                        : 'bg-white/10 text-white hover:bg-white/15'
                                }`}
                            >
                                {loading === pid ? (
                                    <span className="flex items-center gap-1.5">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Processing…
                                    </span>
                                ) : (
                                    <>Subscribe to {plan.name} →</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <p className="text-center text-[10px] text-tm-muted mt-4">
                🔒 Secure billing via Stripe · Cancel anytime · Trial fee converted to bonus days
            </p>
        </div>
    ) : null;

    // ── Render: Active paid subscription ───────────────────────────────────
    const SubscribedSection = isSubscribed ? (
        <div className={`rounded-xl p-4 mb-4 border ${
            membership.status === 'active'   ? 'bg-tm-green/10 border-tm-green/20' :
            membership.status === 'trialing' ? 'bg-yellow-400/10 border-yellow-400/20' :
            membership.status === 'past_due' ? 'bg-tm-red/10 border-tm-red/20' :
            'bg-tm-surface/50 border-white/5'
        }`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-tm-purple/20 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-tm-purple" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-white">{TIER_LABELS[membership.tier] || membership.tier}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                                membership.status === 'active'   ? 'bg-tm-green' :
                                membership.status === 'trialing' ? 'bg-yellow-400 animate-pulse' : 'bg-tm-red'
                            }`} />
                            <span className={`text-xs font-semibold ${
                                membership.status === 'active' ? 'text-tm-green' :
                                membership.status === 'trialing' ? 'text-yellow-400' : 'text-tm-red'
                            }`}>
                                {membership.cancelAtPeriodEnd ? 'Canceling' :
                                 membership.status === 'active'   ? 'Active' :
                                 membership.status === 'trialing' ? 'Trial' :
                                 membership.status === 'past_due' ? 'Past Due' : membership.status}
                            </span>
                        </div>
                    </div>
                </div>
                <CheckCircle className="w-5 h-5 text-tm-green shrink-0 mt-0.5" />
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-tm-muted">
                    {membership.billingInterval && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {membership.billingInterval === 'year' ? 'Annual' : membership.billingInterval === 'month' ? 'Monthly' : '24-Month'}
                        </span>
                    )}
                    {renewalDate && (
                        <span>
                            {membership.cancelAtPeriodEnd ? 'Access ends' : membership.status === 'trialing' ? 'Trial ends' : 'Renews'} {renewalDate}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {membership.cancelAtPeriodEnd ? (
                        <button onClick={handleReactivate} disabled={reactivateLoading} className="flex items-center gap-1 text-tm-green hover:text-green-300 transition-colors text-xs font-semibold">
                            <RefreshCw className={`w-3 h-3 ${reactivateLoading ? 'animate-spin' : ''}`} />
                            {reactivateLoading ? 'Reactivating…' : 'Reactivate'}
                        </button>
                    ) : (
                        <button onClick={() => { setCancelError(null); setShowCancelModal(true); }} className="text-tm-muted hover:text-tm-red transition-colors text-xs">
                            Cancel Plan
                        </button>
                    )}
                    <button onClick={handlePortal} disabled={portalLoading} className="flex items-center gap-1 text-tm-purple hover:text-purple-300 transition-colors font-semibold text-xs">
                        {portalLoading ? 'Opening…' : 'Manage Billing'} <ExternalLink className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    // ── Render: Observer (no trial, no sub) ────────────────────────────────
    const ObserverSection = !trialActive && !trialExpired && !isSubscribed && !isMockExpired ? (
        <div className="rounded-xl p-4 mb-4 border bg-tm-surface/50 border-white/5">
            <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <Star className="w-5 h-5 text-tm-muted" />
                </div>
                <div>
                    <p className="font-bold text-sm text-white">Observer (Free)</p>
                    <p className="text-[10px] text-tm-muted">View signals, no execution</p>
                </div>
            </div>
            <a href="/upgrade" className="block w-full text-center py-2.5 rounded-lg bg-tm-purple text-white text-xs font-bold hover:bg-tm-purple/80 transition-colors">
                Start Free Trial or View Plans →
            </a>
        </div>
    ) : null;

    return (
        <>
        <section className="glass-card overflow-hidden relative">
            {(isSubscribed || trialActive) && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-tm-purple to-pink-500" />
            )}
            <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-tm-purple" />
                    <h3 className="font-semibold text-sm">Subscription Plan</h3>
                    {isMockExpired && (
                        <span className="ml-auto text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
                            MOCK: Trial Expired
                        </span>
                    )}
                </div>

                {ActiveTrialBanner}
                {SubscribedSection}
                {ObserverSection}
                {ExpiredTrialSection}
            </div>
        </section>

        {/* Cancel Modal */}
        {showCancelModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-8">
                <div className="glass-card w-full max-w-md p-6 rounded-2xl border border-tm-red/20">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-tm-red/10 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-tm-red" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base">Cancel Subscription?</h3>
                            <p className="text-xs text-tm-muted mt-1 leading-relaxed">
                                You'll keep full access until{' '}
                                <strong className="text-white">{renewalDate || 'end of billing period'}</strong>.
                                After that, your account moves to Observer tier.
                            </p>
                        </div>
                    </div>
                    {cancelError && (
                        <p className="text-tm-red text-xs mb-3 bg-tm-red/10 border border-tm-red/20 rounded-lg px-3 py-2">{cancelError}</p>
                    )}
                    <div className="flex gap-3 mt-5">
                        <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 rounded-xl bg-tm-surface border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors">
                            Keep Plan
                        </button>
                        <button onClick={handleCancelConfirm} disabled={cancelLoading} className="flex-1 py-3 rounded-xl bg-tm-red/15 border border-tm-red/30 text-tm-red text-sm font-semibold hover:bg-tm-red/25 transition-colors">
                            {cancelLoading ? 'Canceling…' : 'Yes, Cancel Plan'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
