'use client';

/* HeroCtas — the hero conversion block. Per the hero build order it sits
   after the life band: begin the narrated deck (dispatches tm:begin-story,
   which StoryLanding listens for) and jump to the calculator, with the audio
   hints and the long-term-commitment microcopy underneath. */

import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

export function HeroCtas() {
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
        <section className="tm-story tm-heroctas">
            <div className="tm-hero2-ctas">
                <button className="tm-play" onClick={beginStory}>{c.play}</button>
                <button className="tm-hero2-calc" onClick={toCalc}>{c.calcCta}</button>
            </div>
            <div className="tm-hint">{c.hint}</div>
            <div className="tm-hint">{c.hintSilent}</div>
            <div className="tm-hero2-micro">{c.micro}</div>
        </section>
    );
}
