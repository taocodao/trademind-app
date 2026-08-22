'use client';

/* DisciplineSection — "Institutional style discipline, without the institution."
   Sits between the co-pilot hero and ModelTrustSection. Prestige framing that
   deliberately avoids the "hedge fund" phrase (a legal-marketing trap for a
   public page) and the "24/7" phrase (US options do not trade around the
   clock). Three cards make the discipline claim inspectable. */

import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

export function DisciplineSection() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].discipline;

    return (
        <section className="tm-story tm-band tm-band-discipline">
            <div className="tm-band-inner">
                <div className="tm-eyebrow">{c.kicker}</div>
                <h2 className="tm-h2">{c.title}</h2>
                <p className="tm-band-lede">{c.p}</p>

                <div className="tm-band-cards">
                    {c.cards.map((card, i) => (
                        <div className="tm-band-card" key={i}>
                            <div className="tm-band-card-t">{card.t}</div>
                            <p className="tm-band-card-p">{card.p}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
