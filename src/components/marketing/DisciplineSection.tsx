'use client';

/* DisciplineSection — "Institutional-style discipline, without the institution."
   Compact band inside the hero flow, between the capability cards and the
   record table. Prestige framing that deliberately avoids the "hedge fund"
   phrase (a legal-marketing trap for a public page) and the "24/7" phrase
   (US options do not trade around the clock). The three inspectable claims
   that used to be cards here are now the hero capability cards. */

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
                <p className="tm-band-close"><em>{c.close}</em></p>
            </div>
        </section>
    );
}
