'use client';

/* LifeSection — "Built around your life, not the other way around."
   Reframes the owner's second-income impulse into a time-not-spent claim,
   which is safe under FINRA 2210 and the SEC Marketing Rule while still
   delivering the freedom payoff. Closes with an explicit "we are not
   promising an income" disclaimer. Sits immediately before pricing. */

import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

export function LifeSection() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].life;

    return (
        <section className="tm-story tm-band tm-band-life">
            <div className="tm-band-inner">
                <div className="tm-eyebrow">{c.kicker}</div>
                <h2 className="tm-h2">{c.title}</h2>
                <p className="tm-band-lede">{c.p}</p>
                <p className="tm-band-close"><em>{c.close}</em></p>
            </div>
        </section>
    );
}
