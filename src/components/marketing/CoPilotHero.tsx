'use client';

/* CoPilotHero — the homepage hero, v3 (Sep 2026).
   Layout: slogan (doc-subtitle, gradient) above the retained two-line h1,
   rewritten IRA-first subhead, CTA pair (Begin the story scrolls to the
   narrated deck via tm:begin-story; Read the record links to /verify),
   then the four-card row: returns/compounding, strategy, ML gates,
   risk/backtest rigor. Entrance animation is opacity+transform only and
   fully disabled under prefers-reduced-motion (see story.css). */

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

export function CoPilotHero() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].hero;

    const beginStory = () => {
        document.getElementById('story')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.dispatchEvent(new Event('tm:begin-story'));
    };
    const toCalculator = () => {
        document.getElementById('rate-calc')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <section id="hero" className="tm-story tm-hero2">
            <div className="tm-hero2-inner">
                <p role="doc-subtitle" className="tm-slogan">{c.slogan}</p>
                <div className="tm-eyebrow">{c.eyebrow}</div>
                <h1 className="tm-h1">{c.h1a}<br /><em>{c.h1b}</em></h1>
                <p className="tm-sub">{c.sub}</p>

                <div className="tm-hero-ctapair">
                    <button className="tm-play tm-cta-hero" onClick={beginStory}>{c.ctaPrimary}</button>
                    <Link href="/verify" className="tm-cta-hero tm-cta-secondary">{c.ctaSecondary}</Link>
                </div>

                <div className="tm-herocards">
                    {c.cards.map((card, i) => (
                        <div className="tm-herocard" key={i}>
                            <div className="tm-herocard-numeral">{card.numeral}</div>
                            <div className="tm-herocard-label">{card.label}</div>
                            <div className="tm-herocard-body">
                                {card.link === 'calculator'
                                    ? <button className="tm-herocard-link" onClick={toCalculator}>{card.body}</button>
                                    : card.body}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
