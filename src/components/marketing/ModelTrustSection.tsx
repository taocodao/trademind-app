'use client';

/* ModelTrustSection — "The Model, Not the Hype". Three cards: the five entry
   gates, the ML confidence score, and the losses being in the ledger. All
   numbers match the deck's own chapters (0.89 ML confidence on the Sept 2
   entry; −17.8% worst drawdown; the overlay's admitted weakness). */

import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

export function ModelTrustSection() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].model;

    return (
        <section className="tm-story tm-modelsec">
            <div className="tm-sec-inner">
                <div className="tm-kicker">{c.kicker}</div>
                <h2 className="tm-sec-title">{c.title}</h2>
                <div className="tm-model-cards">
                    {c.cards.map((card, i) => (
                        <div className="tm-model-card" key={i}>
                            <div className="tm-model-card-t">{card.t}</div>
                            <p className="tm-model-card-p">{card.p}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
