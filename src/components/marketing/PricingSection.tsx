import React, { useMemo } from 'react';
import { Check, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PricingSection() {
    const { t } = useTranslation();

    const TIERS = useMemo(() => [
        {
            id: 'observer',
            name: t('pricing.observer.name'),
            price: t('pricing.observer.price'),
            period: t('pricing.observer.period'),
            description: t('pricing.observer.description'),
            features: t('pricing.observer.features', { returnObjects: true }) as string[],
            button: t('pricing.observer.button'),
            popular: false
        },
        {
            id: 'builder',
            name: t('pricing.builder.name'),
            price: t('pricing.builder.price'),
            period: t('pricing.builder.period'),
            description: t('pricing.builder.description'),
            features: t('pricing.builder.features', { returnObjects: true }) as string[],
            button: t('pricing.builder.button'),
            popular: false
        },
        {
            id: 'compounder',
            name: t('pricing.compounder.name'),
            price: t('pricing.compounder.price'),
            period: t('pricing.compounder.period'),
            description: t('pricing.compounder.description'),
            features: t('pricing.compounder.features', { returnObjects: true }) as string[],
            button: t('pricing.compounder.button'),
            popular: true
        }
    ], [t]);

    return (
        <section className="w-full max-w-7xl mx-auto py-20 px-6 relative z-10" id="pricing">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('pricing.title')}<br />{t('pricing.subtitle')}</h2>
                <p className="text-tm-muted max-w-2xl mx-auto">{t('pricing.description')}</p>
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

                        <div className="flex items-end gap-1 mb-8">
                            <span className="text-4xl font-bold text-white">{tier.price}</span>
                            <span className="text-tm-muted text-sm mb-1">{tier.period}</span>
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
