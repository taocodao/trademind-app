'use client';

/* CoPilotHero — the static homepage hero. Two-line slogan headline (kept per
   owner), extended co-pilot subhead, and the capability card row (fixed
   schedule / zero emotion / five gates). The CTAs live in HeroCtas, after the
   discipline band, the record table, and the life band. */

import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

export function CoPilotHero() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].hero;

    return (
        <section id="hero" className="tm-story tm-hero2">
            <div className="tm-hero2-inner">
                <div className="tm-eyebrow">{c.eyebrow}</div>
                <h1 className="tm-h1">{c.h1a}<br /><em>{c.h1b}</em></h1>
                <p className="tm-sub">{c.sub}</p>

                <div className="tm-stats">
                    {c.stats.map((s, i) => (
                        <div className="tm-stat" key={i}>
                            <div className="tm-stat-big">{s.big}</div>
                            <div className="tm-stat-label">{s.label}</div>
                            <div className="tm-stat-clarify">{s.clarifier}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
