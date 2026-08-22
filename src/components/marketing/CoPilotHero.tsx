'use client';

/* CoPilotHero — the static homepage hero. Slogan headline (kept per owner),
   co-pilot subhead, sourced trust-stat row, and two CTAs: begin the narrated
   deck (dispatches tm:begin-story, which StoryLanding listens for) and jump
   to the calculator. */

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
    const toCalc = () => {
        document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

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
                <div className="tm-stats-src">{c.statsSrc}</div>

                <div className="tm-hero2-ctas">
                    <button className="tm-play" onClick={beginStory}>{c.play}</button>
                    <button className="tm-hero2-calc" onClick={toCalc}>{c.calcCta}</button>
                </div>
                <div className="tm-hint">{c.hint}</div>
                <div className="tm-hint">{c.hintSilent}</div>
                <div className="tm-hero2-micro">{c.micro}</div>
            </div>
        </section>
    );
}
