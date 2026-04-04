'use client';

import { useState, useMemo, useEffect } from 'react';
import { CreditCard, CheckCircle, ArrowRight, Star, Zap, Layers, Clock, ExternalLink, Crown, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePrivy } from '@privy-io/react-auth';

const TIER_LABELS: Record<string, string> = {
    observer: 'Observer (Free)',
    turbocore: 'TurboCore',
    turbocore_pro: 'TurboCore Pro',
    both_bundle: 'Both Bundle',
    compounder: 'Compounder (Legacy)',
    builder: 'Builder (Legacy)',
};

interface MembershipInfo {
    tier: string;
    status: string | null;
    billingInterval: string | null;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
    priceId: string | null;
    cancelAtPeriodEnd?: boolean;
    cancelAt?: string | null;
    appTrialStatus?: string | null;
    appTrialEnd?: string | null;
    appTrialTier?: string | null;
}

export function SubscriptionManager() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState<string | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
    const [portalLoading, setPortalLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [reactivateLoading, setReactivateLoading] = useState(false);
    const [membership, setMembership] = useState<MembershipInfo>({
        tier: 'observer', status: null, billingInterval: null,
        currentPeriodEnd: null, trialEnd: null, priceId: null,
        cancelAtPeriodEnd: false, cancelAt: null,
    });
    const { getAccessToken } = usePrivy();

    const refreshMembership = async () => {
        const token = await getAccessToken();
        const res = await fetch('/api/settings/tier', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const d = await res.json();
        if (d.tier) setMembership(d);
    };

    // Fetch membership info on mount
    useEffect(() => {
        refreshMembership();
    }, []);

    const currentTier = membership.tier;

    const PLANS = useMemo(() => [
        {
            id: 'turbocore',
            tier: 'turbocore',
            name: t('pricing.turbocore.name', 'TurboCore'),
            icon: CreditCard,
            monthlyPrice: '$29',
            annualPrice: '$249',
            annualSave: t('pricing.turbocore.save_short', 'Save 28%'),
            monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_MONTHLY_PRICE_ID || '',
            annualPriceId: process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_ANNUAL_PRICE_ID || '',
            color: 'purple',
        },
        {
            id: 'turbocore_pro',
            tier: 'turbocore_pro',
            name: t('pricing.turbocore_pro.name', 'TurboCore Pro'),
            icon: Zap,
            monthlyPrice: '$49',
            annualPrice: '$399',
            annualSave: t('pricing.turbocore_pro.save_short', 'Save 32%'),
            monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
            annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '',
            color: 'indigo',
        },
        {
            id: 'both_bundle',
            tier: 'both_bundle',
            name: t('pricing.both_bundle.name', 'Both Bundle'),
            icon: Layers,
            monthlyPrice: '$69',
            annualPrice: '$549',
            annualSave: t('pricing.both_bundle.save_short', 'Save 33%'),
            monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_BUNDLE_MONTHLY_PRICE_ID || '',
            annualPriceId: process.env.NEXT_PUBLIC_STRIPE_BUNDLE_ANNUAL_PRICE_ID || '',
            color: 'pink',
            recommended: true,
        },
    ], [t]);

    const isSubscribed = currentTier !== 'observer';

    const handleCheckout = async (priceId: string, isAnnual: boolean = false) => {
        if (!priceId) {
            alert('This plan is not yet configured. Please check back soon.');
            return;
        }
        setLoading(priceId);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ priceId, isAnnual }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error('Checkout failed', err);
            alert('Failed to initiate checkout. Check console for details.');
        } finally {
            setLoading(null);
        }
    };

    const handleManageBilling = async () => {
        setPortalLoading(true);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/stripe/portal', { 
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {} 
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'No portal URL returned');
            }
        } catch (err) {
            console.error('Portal failed', err);
            alert('Failed to open billing portal.');
        } finally {
            setPortalLoading(false);
        }
    };

    const handleCancelConfirm = async () => {
        setCancelLoading(true);
        setCancelError(null);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/stripe/cancel', {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Cancellation failed');
            setShowCancelModal(false);
            await refreshMembership();
        } catch (err: any) {
            setCancelError(err.message);
        } finally {
            setCancelLoading(false);
        }
    };

    const handleReactivate = async () => {
        setReactivateLoading(true);
        try {
            const res = await fetch('/api/stripe/cancel', { method: 'PUT' });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Reactivation failed');
            }
            await refreshMembership();
        } catch (err: any) {
            console.error('Reactivate error:', err.message);
        } finally {
            setReactivateLoading(false);
        }
    };

    const trialActive = membership.appTrialStatus === 'active' || membership.appTrialStatus === 'second_trial_active';
    const trialDaysLeft2 = trialActive && membership.appTrialEnd ? Math.max(0, Math.ceil((new Date(membership.appTrialEnd).getTime() - Date.now()) / 86400000)) : 0;
    const trialNum = membership.appTrialStatus === 'second_trial_active' ? 2 : 1;
    
    const isPayingSubscriber = membership.appTrialStatus === 'converted';

    // Compute display values
    const statusColor = (membership.status === 'active' || membership.status === 'second_trial_active') ? 'text-tm-green' :
        membership.status === 'trialing' ? 'text-yellow-400' :
        membership.status === 'past_due' ? 'text-tm-red' :
        membership.status === 'canceled' ? 'text-tm-red' : 'text-tm-muted';

    const statusBgColor = (membership.status === 'active' || membership.status === 'second_trial_active') ? 'bg-tm-green/10 border-tm-green/20' :
        membership.status === 'trialing' ? 'bg-yellow-400/10 border-yellow-400/20' :
        membership.status === 'past_due' ? 'bg-tm-red/10 border-tm-red/20' :
        'bg-tm-surface/50 border-white/5';

    const statusLabel = membership.cancelAtPeriodEnd ? 'Canceling' :
        (membership.status === 'active' || membership.status === 'second_trial_active') ? 'Active' :
        membership.status === 'trialing' ? 'Trial' :
        membership.status === 'past_due' ? 'Past Due' :
        membership.status === 'canceled' ? 'Canceled' : '';

    const trialDaysLeft = membership.trialEnd
        ? Math.max(0, Math.round((new Date(membership.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    const renewalDate = membership.currentPeriodEnd
        ? new Date(membership.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <>
        <section className="glass-card overflow-hidden relative">
            {isSubscribed && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-tm-purple to-pink-500" />
            )}

            <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-tm-purple" />
                    <h3 className="font-semibold text-sm">Subscription Plan</h3>
                </div>

                {/* Trial Banner matching Dashboard/AI Hub */}
                {trialActive && !isPayingSubscriber && (
                    <div className="mb-4 rounded-xl p-3 flex items-center gap-3 border border-tm-purple/30 bg-gradient-to-r from-tm-purple/10 to-blue-500/10">
                        <div className="w-8 h-8 rounded-full bg-tm-purple/20 flex items-center justify-center shrink-0">
                            <span className="text-sm">🎉</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white">Free Trial #{trialNum} — {(membership.appTrialTier || '').replace('_', ' ')} Access</p>
                            <p className="text-[10px] text-tm-muted">
                                {trialDaysLeft2 > 0 ? `${trialDaysLeft2} day${trialDaysLeft2 !== 1 ? 's' : ''} remaining · No credit card needed yet` : 'Expires today!'}
                            </p>
                        </div>
                        <a href="/#pricing" className="text-[10px] font-bold text-tm-purple hover:underline whitespace-nowrap shrink-0">
                            Choose a Plan →
                        </a>
                    </div>
                )}

                {/* Enhanced Membership Display */}
                <div className={`rounded-xl p-4 mb-4 border ${statusBgColor}`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                            {isSubscribed ? (
                                <div className="w-10 h-10 rounded-full bg-tm-purple/20 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-tm-purple" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                    <Star className="w-5 h-5 text-tm-muted" />
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-sm text-white">
                                    {TIER_LABELS[currentTier] || currentTier}
                                </p>
                                {statusLabel && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            membership.status === 'active' ? 'bg-tm-green' :
                                            membership.status === 'trialing' ? 'bg-yellow-400 animate-pulse' :
                                            'bg-tm-red'
                                        }`} />
                                        <span className={`text-xs font-semibold ${statusColor}`}>
                                            {statusLabel}
                                            {membership.status === 'trialing' && trialDaysLeft !== null && (
                                                <span className="text-white/50 font-normal"> · {trialDaysLeft}d left</span>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {isSubscribed && (
                            <CheckCircle className="w-5 h-5 text-tm-green shrink-0 mt-0.5" />
                        )}
                    </div>

                    {/* Billing details row */}
                    {isPayingSubscriber && (
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3 text-tm-muted">
                                {membership.billingInterval && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {membership.billingInterval === 'year' ? 'Annual' : 'Monthly'}
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
                                    <button
                                        onClick={handleReactivate}
                                        disabled={reactivateLoading}
                                        className="flex items-center gap-1 text-tm-green hover:text-green-300 transition-colors text-xs font-semibold"
                                    >
                                        {reactivateLoading ? (
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3 h-3" />
                                        )}
                                        {reactivateLoading ? 'Reactivating...' : 'Reactivate'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setCancelError(null); setShowCancelModal(true); }}
                                        className="text-tm-muted hover:text-tm-red transition-colors text-xs"
                                    >
                                        Cancel Plan
                                    </button>
                                )}
                                <button
                                    onClick={handleManageBilling}
                                    disabled={portalLoading}
                                    className="flex items-center gap-1 text-tm-purple hover:text-purple-300 transition-colors font-semibold"
                                >
                                    {portalLoading ? 'Opening...' : 'Manage Billing'}
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}

                    {!isPayingSubscriber && !trialActive && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                             <p className="text-xs text-tm-muted">Upgrade to unlock automated trading and full signals.</p>
                             <a href="/#pricing" className="btn-primary text-xs px-4 py-2 shrink-0">
                                 Choose a Plan
                             </a>
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-8">
                <div className="glass-card w-full max-w-md p-6 rounded-2xl border border-tm-red/20">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-tm-red/10 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-tm-red" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base">Cancel Subscription?</h3>
                            <p className="text-s text-tm-muted mt-1 leading-relaxed">
                                You'll keep full access until{' '}
                                <strong className="text-white">{renewalDate || 'end of billing period'}</strong>.
                                After that, your account moves to the free Observer tier and all AI add-ons are removed.
                            </p>
                        </div>
                    </div>
                    {cancelError && (
                        <p className="text-tm-red text-xs mb-3 bg-tm-red/10 border border-tm-red/20 rounded-lg px-3 py-2">{cancelError}</p>
                    )}
                    <div className="flex gap-3 mt-5">
                        <button
                            onClick={() => setShowCancelModal(false)}
                            className="flex-1 py-3 rounded-xl bg-tm-surface border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors"
                        >
                            Keep Plan
                        </button>
                        <button
                            onClick={handleCancelConfirm}
                            disabled={cancelLoading}
                            className="flex-1 py-3 rounded-xl bg-tm-red/15 border border-tm-red/30 text-tm-red text-sm font-semibold hover:bg-tm-red/25 transition-colors"
                        >
                            {cancelLoading ? 'Canceling...' : 'Yes, Cancel Plan'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
