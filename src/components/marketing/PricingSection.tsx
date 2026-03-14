import React, { useMemo, useState } from 'react';
import { Check, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PricingSection() {
    const { t } = useTranslation();
    const [isAnnual, setIsAnnual] = useState(true);

    const TIERS = useMemo(() => [
        {
            id: 'turbocore',
            name: t('pricing.turbocore.name', 'TurboCore'),
            price: isAnnual ? '$20.75' : '$29',
            period: '/mo',
            billedAction: isAnnual ? 'Billed $249 annually' : 'Billed monthly',
            marketingFrame: isAnnual ? 'Save 28% (3.5 months free)' : '',
            description: t('pricing.turbocore.description', 'ML-powered foundation for steady compounding.'),
            features: [
                'TQQQ Core Model Access',
                'SMA200 Capital Preservation Gate',
                'Automated Tastytrade Execution',
                'Standard UI Experience'
            ],
            button: 'Start Compounding',
            popular: false
        },
        {
            id: 'turbocore_pro',
            name: t('pricing.turbocore_pro.name', 'TurboCore Pro'),
            price: isAnnual ? '$33.25' : '$49',
            period: '/mo',
            billedAction: isAnnual ? 'Billed $399 annually' : 'Billed monthly',
            marketingFrame: isAnnual ? 'Save 32% (4 months free)' : '',
            description: t('pricing.turbocore_pro.description', 'Advanced capabilities with 39.3% historical CAGR.'),
            features: [
                'Enhanced ML Regime Detection',
                'Dynamic VIX-Adjusted Positioning',
                'Early Signal Access',
                'Priority Slack Support'
            ],
            button: 'Go Pro',
            popular: false
        },
        {
            id: 'both_bundle',
            name: t('pricing.both_bundle.name', 'Both Bundle'),
            price: isAnnual ? '$45.75' : '$69',
            period: '/mo',
            billedAction: isAnnual ? 'Billed $549 annually' : 'Billed monthly',
            marketingFrame: isAnnual ? 'Save 33% (4 months free)' : '',
            description: t('pricing.both_bundle.description', 'Get the ultimate edge with the full multi-strategy engine.'),
            features: [
                'TurboCore & TurboCore Pro Models',
                'TurboBounce Mean-Reversion Alpha',
                'Custom Portfolio Allocation Tooling',
                'Direct Founder Office Hours'
            ],
            button: 'Get Everything',
            popular: true
        }
    ], [t, isAnnual]);

    return (
        <section className="w-full max-w-7xl mx-auto py-20 px-6 relative z-10" id="pricing">
            <div className="text-center mb-10">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('pricing.title')}<br />{t('pricing.subtitle')}</h2>
                <p className="text-tm-muted max-w-2xl mx-auto mb-8">{t('pricing.description')}</p>
                
                {/* Billing Toggle */}
                <div className="inline-flex items-center bg-white/5 p-1 rounded-full border border-white/10 mx-auto relative">
                    <button
                        onClick={() => setIsAnnual(false)}
                        className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors ${
                            !isAnnual ? 'text-white' : 'text-tm-muted hover:text-white/80'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setIsAnnual(true)}
                        className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${
                            isAnnual ? 'text-white' : 'text-tm-muted hover:text-white/80'
                        }`}
                    >
                        Annually <span className="text-[10px] bg-tm-green/20 text-tm-green px-1.5 py-0.5 rounded uppercase tracking-wider">Save</span>
                    </button>
                    <div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-tm-purple rounded-full transition-transform duration-300 ease-in-out ${
                            isAnnual ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                        }`} 
                    />
                </div>
                <p className="mt-4 text-xs text-tm-purple/80 font-semibold tracking-wider uppercase">All tiers include a 14-Day Free Trial</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {TIERS.map((tier) => (
                    <div key={tier.id} className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${tier.popular ? 'border-tm-purple bg-tm-purple/5 shadow-[0_0_30px_rgba(124,58,237,0.15)]' : 'border-white/10 bg-tm-card/50'}`}>
                        {tier.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-tm-purple to-[#9d63f5] text-white text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full flex items-center gap-1 shadow-lg shadow-tm-purple/30">
                                <Star className="w-3 h-3 fill-current" /> {t('pricing.popular')}
                            </div>
                        )}
                        <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                        <p className="text-sm text-tm-muted mb-6">{tier.description}</p>

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
                            {tier.features.map((feat, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <Check className={`w-5 h-5 shrink-0 ${tier.popular ? 'text-tm-purple' : 'text-tm-green'}`} />
                                    <span className="text-sm text-gray-300">{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <button className={`w-full py-4 rounded-xl font-bold transition-all ${tier.popular ? 'bg-tm-purple hover:bg-tm-purple/90 text-white shadow-lg shadow-tm-purple/25' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}>
                            {tier.button}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-8 text-center text-xs text-tm-muted uppercase tracking-widest font-mono">
                {t('pricing.billed')}
            </div>
        </section>
    );
}
