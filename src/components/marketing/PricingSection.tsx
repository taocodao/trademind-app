import React, { useMemo, useState, useEffect } from 'react';
import { Check, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePrivy } from '@privy-io/react-auth';
import { PRICING } from '@/lib/pricing-config';

export function PricingSection() {
    const { t, i18n } = useTranslation();
    const { login, authenticated, getAccessToken } = usePrivy();
    // Annual-only pricing — no interval toggle
    const [loadingTier, setLoadingTier] = useState<string | null>(null);
    const [selectedTier, setSelectedTier] = useState<string>('qqq_leaps');

    // Two plans, annual-only: QQQ Basic $252/yr, QQQ LEAPS $336/yr.
    // Names/descriptions/features come from PRICING (single source of truth).
    const TIERS = useMemo(() => [
        {
            id: 'qqq_basic',
            name: PRICING.plans.turbocore_pro_bundle.label,
            tagline: t('pricing.turbocore.tagline'),
            price: `$${PRICING.plans.turbocore_pro_bundle.annual}`,
            period: t('pricing.per_year', '/yr'),
            billedAction: t('pricing.billed_annually', 'Billed annually'),
            marketingFrame: `$${PRICING.plans.turbocore_pro_bundle.annualPerMonth}/mo equivalent · 30% off`,
            description: PRICING.plans.turbocore_pro_bundle.description,
            features: PRICING.plans.turbocore_pro_bundle.features as unknown as string[],
            button: t('pricing.turbocore.btn'),
            popular: false,
            accentColor: '#4f8ef7',
            annualPriceId: process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_PRO_BUNDLE_ANNUAL_PRICE_ID || '',
        },
        {
            id: 'qqq_leaps',
            name: PRICING.plans.qqq_leaps.label,
            tagline: t('pricing.qqq_leaps.tagline', 'ML-powered long-term options on QQQ'),
            price: `$${PRICING.plans.qqq_leaps.annual}`,
            period: t('pricing.per_year', '/yr'),
            billedAction: t('pricing.billed_annually', 'Billed annually'),
            marketingFrame: `$${PRICING.plans.qqq_leaps.annualPerMonth}/mo equivalent · 30% off`,
            description: PRICING.plans.qqq_leaps.description,
            features: PRICING.plans.qqq_leaps.features as unknown as string[],
            button: t('pricing.qqq_leaps.btn', 'Get QQQ LEAPS'),
            popular: true,
            accentColor: '#7c3aed',
            annualPriceId: process.env.NEXT_PUBLIC_STRIPE_QQQ_LEAPS_ANNUAL_PRICE_ID || '',
        }
    ], [t]);

    useEffect(() => {
        const storedTierId = typeof window !== 'undefined' ? sessionStorage.getItem('pendingTierUrl') : null;
        if (authenticated && storedTierId) {
            // Small delay so Privy fully establishes session before we call the API
            const timer = setTimeout(() => {
                const tier = TIERS.find(t => t.id === storedTierId);
                if (tier) handleSubscribe(tier);
                sessionStorage.removeItem('pendingTierUrl');
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [authenticated, TIERS]);

    const handleSubscribe = async (tier: typeof TIERS[0]) => {
        const priceId = tier.annualPriceId;   // annual-only
        if (!priceId) {
            alert('This plan is being configured. Please try again shortly.');
            return;
        }

        if (!authenticated) {
            if (typeof window !== 'undefined') {
                // Store the actual priceId so dashboard can call checkout directly
                sessionStorage.setItem('pendingTierUrl', priceId);
                sessionStorage.setItem('pendingTierAnnual', 'true');
            }
            login();
            return;
        }

        setLoadingTier(tier.id);
        try {
            // Get Privy JWT — works immediately after login without waiting for cookie
            const token = await getAccessToken();

            // Always verify if user already has an active subscription
            const tierRes = await fetch('/api/settings/tier', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const tierData = await tierRes.json();

            // If user is already subscribed, route to billing portal instead of checkout
            if (tierData.tier && tierData.tier !== 'observer') {
                const portalRes = await fetch('/api/stripe/portal', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ locale: i18n.language }),
                });
                const portalData = await portalRes.json();
                if (portalData.url) {
                    window.location.href = portalData.url;
                    return;
                }
            }

            // Not subscribed, proceed to fresh checkout session
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ priceId, isAnnual: true, locale: i18n.language }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Checkout failed');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            alert('Failed to start checkout. Please try again.');
        } finally {
            setLoadingTier(null);
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
        <section className="w-full max-w-7xl mx-auto py-20 px-6 relative z-10" id="pricing">
            <div className="text-center mb-10">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('pricing.title')}<br />{t('pricing.subtitle')}</h2>
                <p className="text-tm-muted max-w-2xl mx-auto mb-8">{t('pricing.description')}</p>
                
                {/* Annual-only billing — one price per plan, one bill a year */}
                <div className="inline-flex items-center gap-2 bg-white/5 px-5 py-2 rounded-full border border-white/10 mx-auto">
                    <span className="text-sm font-bold text-white">{t('pricing.annual_only', 'Annual billing only')}</span>
                    <span className="text-[10px] bg-tm-green/20 text-tm-green px-1.5 py-0.5 rounded uppercase tracking-wider">{t('pricing.save_badge', 'SAVE 30%')}</span>
                </div>
                <p className="mt-4 text-xs text-tm-purple/80 font-semibold tracking-wider uppercase">{t('pricing.trial_notice', 'All tiers include a 14-Day Free Trial')}</p>
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
                            {/* Selected ring indicator */}
                            {isSelected && !tier.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4f8ef7] text-white text-[10px] font-bold uppercase tracking-widest py-0.5 px-3 rounded-full">
                                    ✓ Selected
                                </div>
                            )}
                            {isSelected && tier.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-tm-purple to-[#9d63f5] text-white text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full flex items-center gap-1 shadow-lg shadow-tm-purple/30">
                                    <Star className="w-3 h-3 fill-current" /> {t('pricing.popular')}
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                            <p className={`text-xs italic mb-2 font-medium ${tier.popular ? 'text-tm-purple/80' : 'text-[#4f8ef7]/80'}`}>{tier.tagline}</p>
                            <p className="text-sm text-tm-muted mb-6 leading-relaxed">{tier.description}</p>

                            <div className="flex flex-col mb-8">
                                <div className="flex items-end gap-1 mb-1">
                                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                                    <span className="text-tm-muted text-sm mb-1">{tier.period}</span>
                                </div>
                                <span className="text-xs text-tm-muted">{tier.billedAction}</span>
                                {tier.marketingFrame && (
                                    <span className="mt-2 text-xs font-bold text-tm-green py-1 px-2 bg-tm-green/10 rounded-md w-fit">
                                        {tier.marketingFrame}
                                    </span>
                                )}
                            </div>

                            <ul className="flex flex-col gap-4 mb-8 flex-grow">
                                {(Array.isArray(tier.features) ? tier.features : []).map((feat, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <Check className={`w-5 h-5 shrink-0 ${tier.popular || isSelected ? 'text-tm-purple' : 'text-tm-green'}`} />
                                        <span className="text-sm text-gray-300">{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleSubscribe(tier); }}
                                disabled={loadingTier !== null}
                                className={`w-full py-4 rounded-xl font-bold transition-all disabled:opacity-50 ${
                                    isSelected
                                        ? tier.popular
                                            ? 'bg-tm-purple hover:bg-tm-purple/90 text-white shadow-lg shadow-tm-purple/25'
                                            : 'bg-[#4f8ef7] hover:bg-[#4f8ef7]/90 text-white shadow-lg shadow-[#4f8ef7]/25'
                                        : tier.popular
                                            ? 'bg-tm-purple hover:bg-tm-purple/90 text-white shadow-lg shadow-tm-purple/25'
                                            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                                }`}
                            >
                                {loadingTier === tier.id ? t('pricing.loading', 'Redirecting...') : tier.button}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 text-center text-xs text-tm-muted uppercase tracking-widest font-mono">
                {t('pricing.billed')}
            </div>
        </section>
    );
}
