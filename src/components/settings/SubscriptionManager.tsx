'use client';

import { useState, useMemo } from 'react';
import { CreditCard, CheckCircle, ArrowRight, Star, Zap, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TIER_LABELS: Record<string, string> = {
    observer: 'Observer (Free)',
    turbocore: 'TurboCore',
    turbocore_pro: 'TurboCore Pro',
    both_bundle: 'Both Bundle',
    compounder: 'Compounder (Legacy)',
    builder: 'Builder (Legacy)',
};

export function SubscriptionManager({ currentTier }: { currentTier: string }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState<string | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

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
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    return (
        <section className="glass-card overflow-hidden relative">
            {isSubscribed && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-tm-purple to-pink-500" />
            )}

            <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-tm-purple" />
                    <h3 className="font-semibold text-sm">Subscription Plan</h3>
                </div>

                {/* Current Tier Display */}
                <div className={`rounded-xl p-3 mb-4 flex items-center gap-2 ${
                    isSubscribed 
                        ? 'bg-tm-green/10 border border-tm-green/20' 
                        : 'bg-tm-surface/50 border border-white/5'
                }`}>
                    {isSubscribed ? (
                        <CheckCircle className="w-4 h-4 text-tm-green shrink-0" />
                    ) : (
                        <Star className="w-4 h-4 text-tm-muted shrink-0" />
                    )}
                    <div>
                        <p className={`font-bold text-sm ${isSubscribed ? 'text-tm-green' : 'text-tm-muted'}`}>
                            {TIER_LABELS[currentTier] || currentTier} {isSubscribed ? '— Active' : ''}
                        </p>
                        {!isSubscribed && (
                            <p className="text-xs text-tm-muted mt-0.5">Upgrade to unlock automated trading.</p>
                        )}
                    </div>
                </div>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-1 mb-4 p-1 bg-tm-surface/50 rounded-full border border-white/5">
                    <button
                        onClick={() => setBillingPeriod('monthly')}
                        className={`flex-1 text-center text-xs font-bold py-1.5 rounded-full transition-all ${
                            billingPeriod === 'monthly' ? 'bg-tm-purple text-white' : 'text-tm-muted'
                        }`}
                    >
                        {t('pricing.monthly_tab', 'Monthly')}
                    </button>
                    <button
                        onClick={() => setBillingPeriod('annual')}
                        className={`flex-1 text-center text-xs font-bold py-1.5 rounded-full transition-all flex items-center justify-center gap-1 ${
                            billingPeriod === 'annual' ? 'bg-tm-purple text-white' : 'text-tm-muted'
                        }`}
                    >
                        {t('pricing.annual_tab', 'Annual')} <span className="text-[8px] bg-tm-green/20 text-tm-green px-1 rounded">{t('pricing.save_badge', 'SAVE')}</span>
                    </button>
                </div>

                {/* Plan Cards */}
                <div className="space-y-3">
                    {PLANS.map(plan => {
                        const isCurrentPlan = currentTier === plan.tier;
                        const priceId = billingPeriod === 'annual' ? plan.annualPriceId : plan.monthlyPriceId;
                        const price = billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice;
                        const period = billingPeriod === 'annual' ? '/yr' : '/mo';
                        const Icon = plan.icon;

                        return (
                            <div key={plan.id} className={`bg-tm-bg/50 border rounded-xl p-4 flex items-center justify-between transition-all ${
                                plan.recommended ? 'border-tm-purple/40 bg-tm-purple/5' : 'border-white/5'
                            } ${isCurrentPlan ? 'ring-1 ring-tm-green/30' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${plan.color}-500/10 border border-${plan.color}-500/20`}>
                                        <Icon className={`w-5 h-5 text-${plan.color}-400`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-sm">{plan.name}</h4>
                                            {plan.recommended && (
                                                <span className="text-[8px] bg-tm-purple/20 text-tm-purple px-1.5 py-0.5 rounded font-bold uppercase">Best Value</span>
                                            )}
                                        </div>
                                        <p className="text-lg font-black font-mono mt-0.5">
                                            {price}<span className="text-xs font-normal text-tm-muted">{period}</span>
                                        </p>
                                        {billingPeriod === 'annual' && (
                                            <p className="text-[10px] text-tm-green font-semibold">{plan.annualSave}</p>
                                        )}
                                    </div>
                                </div>

                                {isCurrentPlan ? (
                                    <span className="text-xs font-bold text-tm-green px-3 py-1.5 bg-tm-green/10 rounded-lg">
                                        Current
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleCheckout(priceId, billingPeriod === 'annual')}
                                        disabled={loading !== null}
                                        className="btn-primary text-xs flex items-center gap-1 px-4 py-2"
                                    >
                                        {loading === priceId ? 'Loading...' : isSubscribed ? 'Switch' : 'Subscribe'}
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                <p className="text-[10px] text-tm-muted text-center mt-3">
                    {t('pricing.trial_notice_sub', 'All plans include a 14-day free trial. Cancel anytime.')}
                </p>
            </div>
        </section>
    );
}
