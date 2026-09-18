'use client';

/* CoPilotHero — the homepage hero, v3 (Sep 2026).
   Layout: slogan (doc-subtitle, gradient) above the retained two-line h1,
   merged IRA-first subhead, three CTAs (Begin the story, Read the record,
   Browse every trade), then the four-card row: returns/compounding,
   strategy, ML gates, risk/backtest rigor. Entrance animation uses
   clip-path + opacity only (never translateY on scroll reveals). Card
   numerals count up once on intersection via requestAnimationFrame;
   prefers-reduced-motion renders final values immediately. */

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

/* Ease-out cubic count-up; final value lands exactly, reduced-motion shows it at once. */
function animateCounter(el: HTMLElement, endValue: number, decimals: number, suffix: string, duration = 800) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = endValue.toFixed(decimals) + suffix;
        return;
    }
    const start = performance.now();
    const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (endValue * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

export function CoPilotHero() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].hero;
    const cardsRef = useRef<HTMLDivElement>(null);

    /* Headline: word-by-word masked reveal, left to right, plays ONCE on
       mount. Every 30s after, a brightness flash walks letter by letter
       across both lines (class toggle + reflow restarts the CSS
       animations; inline per-letter delays keep the L2R order). Letters
       carry a global index across both lines so the flash crosses the
       line break seamlessly. Reduced-motion forces the static state. */
    const h1Ref = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        const el = h1Ref.current;
        if (!el) return;
        const id = setInterval(() => {
            el.classList.remove('tm-flash');
            void el.offsetWidth; // restart the CSS animations
            el.classList.add('tm-flash');
        }, 30000);
        return () => clearInterval(id);
    }, [lang]);
    const lines = useMemo(() => {
        let wi = 0, li = 0;
        const mk = (text: string) => text.split(/\s+/).filter(Boolean).map((w) => ({
            w,
            delay: 140 + wi++ * 130,
            letters: Array.from(w).map(() => li++),
        }));
        return [mk(c.h1a), mk(c.h1b)];
    }, [c]);

    useEffect(() => {
        const root = cardsRef.current;
        if (!root) return;
        const els = Array.from(root.querySelectorAll<HTMLElement>('[data-count]'));
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target as HTMLElement;
                if (el.dataset.animated) return;
                el.dataset.animated = 'true';
                animateCounter(
                    el,
                    parseFloat(el.dataset.value || '0'),
                    parseInt(el.dataset.dec || '0', 10),
                    el.dataset.suffix || ''
                );
            });
        }, { threshold: 0.4 });
        els.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [lang]);

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
                <h1 className="tm-h1" ref={h1Ref}>
                    <span className="tm-h1-line">
                        {lines[0].map((word, i) => (
                            <span key={i} className="tm-wmask">
                                <span className="tm-w" style={{ animationDelay: `${word.delay}ms` }}>
                                    {word.letters.map((ln, j) => (
                                        <span key={j} className="tm-l" style={{ animationDelay: `${ln * 60}ms` }}>{word.w[j]}</span>
                                    ))}
                                    {i < lines[0].length - 1 ? '\u00A0' : ''}
                                </span>
                            </span>
                        ))}
                    </span><br />
                    <span className="tm-h1-line">
                        <em className="tm-h1-line2">
                            {lines[1].map((word, i) => (
                                <span key={i} className="tm-wmask">
                                    <span className="tm-w" style={{ animationDelay: `${word.delay}ms` }}>
                                        {word.letters.map((ln, j) => (
                                            <span key={j} className="tm-l" style={{ animationDelay: `${ln * 60}ms` }}>{word.w[j]}</span>
                                        ))}
                                        {i < lines[1].length - 1 ? '\u00A0' : ''}
                                    </span>
                                </span>
                            ))}
                        </em>
                    </span>
                </h1>
                <p className="tm-sub">{c.sub}</p>

                <div className="tm-hero-ctapair">
                    <button className="tm-play tm-cta-hero" onClick={beginStory}>{c.ctaPrimary}</button>
                    <Link href="/verify" className="tm-cta-hero tm-cta-secondary">{c.ctaSecondary}</Link>
                    <Link href="/verify/ledger" className="tm-cta-hero tm-cta-tertiary tm-cta-arrow">{c.ctaLedger}</Link>
                </div>

                <div className="tm-herocards" ref={cardsRef}>
                    {c.cards.map((card, i) => (
                        <div className={`tm-herocard ${i === 0 ? 'tm-herocard-primary' : ''}`} key={i}>
                            <div className="tm-herocard-numeral">
                                {card.numSegs.map((seg, k) =>
                                    'v' in seg ? (
                                        <span
                                            key={k}
                                            className="tm-num"
                                            data-count
                                            data-value={seg.v}
                                            data-dec={seg.dec ?? 0}
                                        >{seg.v.toFixed(seg.dec ?? 0)}</span>
                                    ) : (
                                        <span key={k}>{seg.t}</span>
                                    )
                                )}
                            </div>
                            <div className="tm-herocard-label">{card.label}</div>
                            <div className="tm-herocard-body">
                                {card.link === 'calculator'
                                    ? <button className="tm-herocard-link" onClick={toCalculator}>{card.body}</button>
                                    : <>{card.body}{i === 3 ? <> <Link href="/verify/ledger" className="tm-herocard-anchor">{c.ledgerLink}</Link></> : null}</>
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
