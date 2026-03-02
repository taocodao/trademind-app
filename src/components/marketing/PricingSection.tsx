import React from 'react';
import { Check, Star } from 'lucide-react';

const TIERS = [
    {
        name: 'The Observer',
        price: 'Free',
        period: '',
        description: 'Watch the signals and verify the performance.',
        features: [
            'Delayed Signal Feed',
            'View Live Strategy Stats',
            'Options Education Course',
            'Community Access'
        ],
        button: 'Start Observing',
        popular: false
    },
    {
        name: 'The Builder',
        price: '$29',
        period: '/mo',
        description: 'For growing accounts under $15,000.',
        features: [
            'Real-Time Signal Alerts',
            '1-Click Trade Approval',
            'Position Sizing Calculator',
            'Live Portfolio Sync'
        ],
        button: 'Start Building',
        popular: false
    },
    {
        name: 'The Compounder',
        price: '$49',
        period: '/mo',
        description: 'Maximum automation for hands-free wealth generation.',
        features: [
            'Full Auto-Approve API Routing',
            'Advanced IV-Crush Filters',
            'Priority Support 24/7',
            'Early Access to New Algos'
        ],
        button: 'Automate Now',
        popular: true
    }
];

export function PricingSection() {
    return (
        <section className="w-full max-w-7xl mx-auto py-20 px-6 relative z-10" id="pricing">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Transparent Pricing.<br />Zero AUM Fees.</h2>
                <p className="text-tm-muted max-w-2xl mx-auto">We are a software platform, not a hedge fund. We don't take a percentage of your wealth. Keep 100% of your compounding gains.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {TIERS.map((tier, idx) => (
                    <div key={idx} className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${tier.popular ? 'border-tm-purple bg-tm-purple/5 shadow-[0_0_30px_rgba(124,58,237,0.15)]' : 'border-white/10 bg-tm-card/50'}`}>
                        {tier.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-tm-purple to-[#9d63f5] text-white text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full flex items-center gap-1 shadow-lg shadow-tm-purple/30">
                                <Star className="w-3 h-3 fill-current" /> Most Popular
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
                Billed annually or monthly. Cancel anytime online.
            </div>
        </section>
    );
}
