'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CHAPTERS, NAV, LEDGER, WINDOWS, FULL_WINDOW } from './storyData';
import { STORY_I18N, type StoryLang } from './storyI18n';
import { WORDS_I18N } from './wordsI18n';
import { DecisionMap } from './DecisionMap';

/* ─────────────────────────────────────────────────────────────────────────────
   StoryLanding — "A track record, read aloud." · deck edition
   One-page slide presentation: arrows/keys navigate, narration auto-plays per
   slide, transcript underlines word-by-word and auto-scrolls (karaoke).

   Design rules carried over from deep research:
     · user-gesture start (iOS autoplay is absolute)
     · risk disclosures SPOKEN in audio (FINRA audio guidance) and visible in text
     · temporal contiguity: beat/underline synced to narration timestamps
     · unfavorable moments annotated with equal-or-greater prominence
     · full transcript available (WCAG 1.2.1), collapsed by default
     · instrumented: slide views, beat interactions, A/B narrated vs silent
   ─────────────────────────────────────────────────────────────────────────── */

interface StoryLandingProps {
    onCta?: () => void;
    ctaLabel?: string;
}

type Variant = 'narrated' | 'silent';

const SLIDE_IDS = ['hero', ...CHAPTERS.map(c => c.id), 'appendix', 'close'];

function track(event: string, chapter?: string, variant?: Variant) {
    try {
        fetch('/api/landing-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, chapter, variant, ts: Date.now() }),
            keepalive: true,
        }).catch(() => {});
    } catch { /* instrumentation never breaks the page */ }
}

/* English slide copy (default language) — es/zh live in storyI18n.ts */
const EN = {
    hero: {
        eyebrow: 'TradeMind · QQQ LEAPS Strategy', h1a: 'Hear every trade.', h1b: 'Judge for yourself.',
        sub: '5.6 years, fully disclosed: 36.3% average annual growth vs. QQQ’s 16.6% — worst drop 17.8% instead of 35.6%. Every trade shown. Every loss included. No cherry-picking.',
        play: '▶ Begin the story',
        hintNarrated: 'A track record, read aloud — 12 slides · audio-synced · ~8 minutes · full transcript on the last slide',
        hintSilent: 'A track record, in print — 12 slides · an 8-minute read · full methodology inside',
        note: 'Press play to begin the story.',
    },
    ui: {
        ch1title: 'September 2, 2025', ch2title: 'One contract, a hundred shares',
        comptitle: 'What patience looked like', compFrom: '$10,000 in January 2021', compAria: 'Growth of ten thousand dollars, strategy versus QQQ buy and hold, January 2021 to August 2026',
        compCap: 'Both engines blended; the final fifteen months are tape-verified. ',
        compCapB: 'Drawdowns are the tuition of compounding — the smaller the hole, the faster you’re back at your peak.',
        compZone: 'QQQ underwater · ~25 months', compHole: '−17.8% · back at peak in 10 weeks',
        ch3title: 'Winning often ≠ winning', maptitle: 'Five and a half years, every decision',
        ch4title: 'Autumn 2023, lived day by day', ch5title: 'Us vs. simply buying QQQ',
        ch6title: 'The record being written',
        ch1fig: 'mid-price fill · real exchange quote $131.00 / $136.00 · first entry of the final, tape-verified cycle',
        contract: 'Contract', positioning: 'Positioning', entryChecklist: 'Entry checklist', fillSource: 'Fill source',
        ch1pos: 'Deep in the money · ~1 year to expiry',
        ch1check: '5 gates — momentum · trend · volatility · regime · ML — all green',
        ch1src: 'OPRA tape, mid-price, commission included',
        ch2a: 'dollar-for-dollar with QQQ', ch2b: 'of time for the thesis to work', ch2c: 'of the cost of shares outright',
        ch2cap1: 'Leverage with a defined cost and no margin loan. ', ch2cap2: 'When QQQ falls, this falls faster.',
        ch3a: 'covered-call trades · 5.6 years', ch3b: 'win rate', ch3c: 'net result of the overlay',
        ch3p1: 'The data also taught us when ', ch3p2: 'not', ch3p3: ' to sell: strong trend + thin premium = no sale — a rule tested in public, adopted after 21 out-of-sample trials. And still: on the real tape, the final 15 months\' overlay lost $1,776 net. ',
        ch3p4: 'Every loss is in the ledger.',
        mapCap1: 'Tap any marker for the actual fill. ',
        mapCap2: 'The losses are annotated too — they are part of the record.',
        mapLegendQ: 'QQQ price', mapLegendS: 'TradeMind portfolio',
        mapIdx: 'both indexed to 100 · Jan 2021', replay: '↺ Replay',
        mapAria: 'QQQ price versus strategy portfolio value, indexed to 100, January 2021 to August 2026, with eight annotated decision points',
        ch4a: 'September 5, 2023 — the peak', ch4b: 'October 26 — seven weeks later', ch4c: 'maximum drawdown · model-priced years',
        ch4cap1: 'The model that prices the early years smooths the storms — on the real tape, March 2026 measured ',
        ch4cap2: '. Both numbers stay on this page, because both are true. ',
        ch4cap3: 'The next drawdown could be deeper — the recovery is never owed to you.',
        ch5a: 'strategy · 5.6 years', ch5b: 'QQQ buy & hold', ch5c: 'our worst hole', ch5d: 'QQQ\'s worst hole',
        ch5cap1: 'Sharpe ratio: 1.48 vs 0.80. We won on every measure over this window — ',
        ch5cap2: 'and that is exactly why you should be skeptical. Five years is one set of weather; the next bear will not look like the last one.',
        status: 'Status', livePaper: 'Live paper trading · IBKR', since: 'Since', sinceVal: 'August 1, 2026', curPos: 'Current position',
        cash: '100% cash', dips: 'Qualifying dips so far', gate: 'Overlay gate',
        gateVal: 'Trend × premium rule — live since Aug 17, 2026', logged: 'Decisions logged',
        loggedVal: 'Every trading day, in public',
        ch6cap1: 'Patience is the strategy. When it acts, you see it the same time we do. ',
        ch6cap2: 'Live results may be better or worse than anything simulated.',
        ch7title: 'All {n} fills. Nothing hidden.',
        ch7pre1: 'Every fill in this ledger is ', ch7pre2: 'model-priced',
        ch7pre3: ' (Black-Scholes on VIX-implied volatility, $1/contract; modeled strikes shown rounded to the nearest dollar, fixed-tenor expiries shown by month). The final 15 months were independently re-run on the real OPRA tape — see the appendix.',
        appKicker: 'Appendix · How the record is made',
        appTitle: 'How we backtest — and how the strategy earns changes',
        m1t: 'Two pricing layers, both disclosed',
        m1p: '2021 – May 2025: model-priced fills — Black-Scholes on VIX-implied volatility, $1/contract commissions, modeled strikes (shown rounded) and fixed-tenor expiries. June 2025 – Aug 2026: independently re-run on the real OPRA NBBO tape via Databento — mid-price fills on actual listed contracts, real listed expirations, $0.65/contract.',
        m2t: 'The fidelity cross-check',
        m2p: 'The same final 15 months, both engines. Model-priced: +61.1%, worst dip −11.7%. Real tape: +83.9%, worst dip −30.4%. The model understates the storms — which is why every drawdown number on this page says which engine measured it.',
        m3t: 'Ideas earn their place',
        m3p: 'Improvements are tested as walk-forward experiments — trained on past data, judged on 21 out-of-sample paths, and adopted only if they clear a strict bar. The overlay\'s trend × premium gate cleared it (18 of 21) and went live August 17, 2026. Ideas that fail get rejected in public.',
        wTitle: 'The same tape, different windows',
        wSub: 'No strategy wins every month. Here is the full record broken into its regimes — including the windows where buy-and-hold was the better seat.',
        wCap1: 'Same simulation, same rules — just sliced. ',
        wCap2: 'The two-year grind is the window where buy-and-hold beat us (+41.7% vs +38.7%). It stays in the table.',
        closeKicker: 'The fine print, in the open', closeTitle: 'Methodology & disclosures',
        disc1: 'Methodology.',
        disc1p: ' Simulation January 4, 2021 – August 14, 2026. 2021 – May 2025 fills are model-priced: Black-Scholes on VIX-implied volatility, $1/contract commissions, modeled strikes (shown rounded to the nearest dollar) and fixed-tenor expiries — not listed contracts. June 2025 – August 14, 2026 was independently re-run on real OPRA NBBO quotes (Databento): mid-price fills on the actual listed contract at each decision bar, real listed expirations, $0.65/contract — that 15-month segment returned +83.9% with a −30.4% maximum drawdown (model engine for the same window: +61.1%, −11.7%). Live layer: IBKR paper account, decisions logged daily since August 1, 2026.',
        disc2: 'Simulated performance. The final fifteen months are as close to live as a backtest gets — real quotes, mid-price fills. Past performance — simulated or live — does not guarantee future results.',
        disc2p: ' Options involve substantial risk and are not suitable for every investor; you can lose your entire investment. Simulated results have inherent limitations: no actual money was at risk, some results benefit from hindsight, and simulations can over- or under-compensate for liquidity and market impact. TradeMind never connects to or submits orders to your brokerage — signals only help you enter the order yourself. This page is educational material, not investment advice or a solicitation.',
        transcriptSummary: 'Full narration transcript',
        cta: 'Start your account',
        winFull: 'Full record', winFullDates: 'Jan 2021 → Aug 2026',
        playLbl: '▶ Play', pauseLbl: '❚❚ Pause',
        ch4from: 'Jan 2021', ch4to: 'Aug 2026 · $169,249',
        ch4aria: 'Strategy equity curve, January 2021 to August 2026',
    } as Record<string, string>,
    fallback: {
        hero: 'Press play to begin the story.',
        appendix: 'How the record is made — methodology and regime windows.',
        close: 'Methodology, disclosures, and the full transcript.',
    },
    aria: {
        prev: 'Previous slide', next: 'Next slide', playPause: 'Play or pause narration',
        mute: 'Mute narration', muted: 'Muted', sound: 'Sound on', slide: 'Slide',
        transcript: 'Narration transcript', replay: 'Replay the animation', transcriptOpen: 'transcript_open',
    },
};

export function StoryLanding({ onCta, ctaLabel }: StoryLandingProps) {
    const { i18n } = useTranslation();
    const lang: StoryLang = (i18n.language || 'en').split('-')[0] === 'es' ? 'es'
        : (i18n.language || 'en').split('-')[0] === 'zh' ? 'zh' : 'en';
    const ov = STORY_I18N[lang];
    const hero = ov?.hero ?? EN.hero;
    const ui = ov?.ui ?? EN.ui;
    const fallback = ov?.fallback ?? EN.fallback;
    const aria = ov?.aria ?? EN.aria;
    const chapters = useMemo(() => ov
        ? CHAPTERS.map(c => ({ ...c, kicker: ov.chapters[c.id]?.kicker ?? c.kicker,
            title: ov.chapters[c.id]?.title ?? c.title, text: ov.chapters[c.id]?.text ?? c.text,
            audio: lang === 'en' ? c.audio : `/audio/landing/${lang}/${c.id}.mp3` }))
        : CHAPTERS, [ov, lang]);
    const words = WORDS_I18N[lang] ?? WORDS_I18N.en;
    const beats = ov ? ov.beats : null;
    const beatTimes = ov?.beatTimes;
    const windows = ov ? ov.windows : null;
    const fullWindowOv = ov?.fullWindow;
    const ledgerL = ov?.ledger;
    const ledgerHead = ov?.ledgerHead;
    const ledgerTag = ov?.ledgerTag;
    const tableHead = ov?.tableHead;
    const ctaText = ctaLabel ?? ui.cta;
    const [slideIdx, setSlideIdx] = useState(0);
    const [started, setStarted] = useState(false);
    const [muted, setMuted] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [wordIdx, setWordIdx] = useState(-1);
    const [variant] = useState<Variant>(() => {
        if (typeof window === 'undefined') return 'narrated';
        const saved = localStorage.getItem('tm_story_variant');
        if (saved === 'narrated' || saved === 'silent') return saved;
        const v: Variant = Math.random() < 0.5 ? 'narrated' : 'silent';
        localStorage.setItem('tm_story_variant', v);
        track('variant_assigned', undefined, v);
        return v;
    });

    const playerRef = useRef<HTMLAudioElement | null>(null);
    const tickerRef = useRef<HTMLDivElement | null>(null);
    const tickerTrackRef = useRef<HTMLDivElement | null>(null);
    const slideIdxRef = useRef(0);
    const startedRef = useRef(false);
    const mutedRef = useRef(false);

    const narrationOn = variant === 'narrated' && !muted;
    const slideId = SLIDE_IDS[slideIdx];
    const slideChapter = chapters.find(c => c.id === slideId);

    /* ── language switched mid-session: stop narration, reset karaoke ── */
    const langRef = useRef(lang);
    useEffect(() => {
        if (langRef.current === lang) return;
        langRef.current = lang;
        const el = playerRef.current;
        el?.pause();
        setPlaying(false); setWordIdx(-1); setProgress(0);
    }, [lang]);

    /* ── navigation ── */
    const goTo = useCallback((idx: number, opts: { autoplay?: boolean } = {}) => {
        const i = Math.max(0, Math.min(SLIDE_IDS.length - 1, idx));
        slideIdxRef.current = i;
        setSlideIdx(i);
        setWordIdx(-1);
        setProgress(0);
        const id = SLIDE_IDS[i];
        track('slide_view', id, variant);
        const ch = chapters.find(c => c.id === id);
        const el = playerRef.current;
        if (ch && startedRef.current && narrationOn && el && (opts.autoplay ?? true)) {
            if (!el.src.endsWith(ch.audio)) el.src = ch.audio;
            el.play().catch(() => {});
            setPlaying(true);
        } else {
            el?.pause();
            setPlaying(false);
        }
    }, [narrationOn, variant, chapters]);

    const begin = () => {
        setStarted(true);
        startedRef.current = true;
        track('story_start', undefined, variant);
        goTo(1);
    };

    const togglePlay = () => {
        if (!started) { begin(); return; }
        const el = playerRef.current;
        if (!el) return;
        if (playing) { el.pause(); setPlaying(false); return; }
        if (slideChapter) {
            if (!el.src.endsWith(slideChapter.audio)) el.src = slideChapter.audio;
            el.play().catch(() => {});
            setPlaying(true);
        }
    };

    /* ── audio events: progress, karaoke, auto-advance ── */
    useEffect(() => {
        const el = playerRef.current;
        if (!el) return;
        const onTime = () => {
            if (!el.duration) return;
            setProgress(el.currentTime / el.duration);
            const id = SLIDE_IDS[slideIdxRef.current];
            const wlist = words[id];
            if (wlist) {
                const t = el.currentTime;
                let wi = -1;
                for (let k = 0; k < wlist.length; k++) {
                    if (t >= wlist[k].s - 0.05) wi = k; else break;
                }
                setWordIdx(wi);
            }
        };
        const onEnd = () => {
            const id = SLIDE_IDS[slideIdxRef.current];
            track('chapter_complete', id, variant);
            setPlaying(false);
            if (!startedRef.current || mutedRef.current) return;
            const next = slideIdxRef.current + 1;
            if (next < SLIDE_IDS.length) setTimeout(() => goTo(next), 700);
        };
        el.addEventListener('timeupdate', onTime);
        el.addEventListener('ended', onEnd);
        return () => { el.removeEventListener('timeupdate', onTime); el.removeEventListener('ended', onEnd); };
    }, [variant, goTo, words]);

    /* ── karaoke ticker: roll the single line so the active word stays visible ── */
    useEffect(() => {
        const box = tickerRef.current;
        const track = tickerTrackRef.current;
        if (!box || !track) return;
        if (wordIdx < 0) { track.style.transform = 'translateX(0px)'; return; }
        const wordEl = track.children[wordIdx] as HTMLElement | undefined;
        if (!wordEl) return;
        const max = Math.max(0, track.scrollWidth - box.clientWidth);
        const x = Math.min(Math.max(wordEl.offsetLeft - box.clientWidth * 0.28, 0), max);
        track.style.transform = `translateX(${-x}px)`;
    }, [wordIdx, slideId]);

    /* ── keyboard ── */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goTo(slideIdxRef.current + 1, { autoplay: startedRef.current });
            else if (e.key === 'ArrowLeft') goTo(slideIdxRef.current - 1, { autoplay: startedRef.current });
            else if (e.key === ' ') { e.preventDefault(); if (narrationOn) togglePlay(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    /* ── equity-curve state (drawdown slide) ── */
    const [curveDrawn, setCurveDrawn] = useState(false);
    useEffect(() => { if (slideId === 'ch4' || slideId === 'compound') setCurveDrawn(true); }, [slideId]);

    /* portrait chart geometry on phones so axis labels stay readable */
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 720px)');
        const fn = () => setNarrow(mq.matches);
        fn();
        mq.addEventListener('change', fn);
        return () => mq.removeEventListener('change', fn);
    }, []);

    const W = narrow ? 440 : 800, H = narrow ? 470 : 300, P = narrow ? 30 : 34;
    const axisFont = narrow ? 15 : 13;
    const troughFont = narrow ? 16 : 14;

    /* compounding chart: growth of $10k, strategy vs QQQ buy & hold */
    const cW = narrow ? 440 : 860, cH = narrow ? 470 : 330;
    const cPL = narrow ? 46 : 54, cPR = narrow ? 14 : 18, cPT = 30, cPB = narrow ? 42 : 38;
    const cAxis = narrow ? 15 : 13;
    const cStrat = NAV.map(d => d.nav / 3);
    const cQqq = NAV.map(d => 10000 * d.spot / NAV[0].spot);
    const cMin = 5000, cMax = 60000;
    const cX = (i: number) => cPL + i * (cW - cPL - cPR) / (NAV.length - 1);
    const cY = (v: number) => cH - cPB - (v - cMin) / (cMax - cMin) * (cH - cPT - cPB);
    const idxAt = (iso: string) => { const k = NAV.findIndex(p => p.d >= iso); return k < 0 ? NAV.length - 1 : k; };
    const cPath = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${cX(i).toFixed(1)} ${cY(v).toFixed(1)}`).join(' ');
    const cYears: { i: number; y: string }[] = [{ i: 0, y: NAV[0].d.slice(0, 4) }];
    NAV.forEach((p, i) => { if (i > 0 && p.d.slice(0, 4) !== NAV[i - 1].d.slice(0, 4)) cYears.push({ i, y: p.d.slice(0, 4) }); });
    const vals = NAV.map(d => d.nav);
    const min = Math.min(...vals) * 0.985, max = Math.max(...vals) * 1.015;
    const cx = (i: number) => P + i * (W - 2 * P) / (NAV.length - 1);
    const cy = (v: number) => H - P - (v - min) / (max - min) * (H - 2 * P);
    let troughI = 0; vals.forEach((v, i) => { if (v < vals[troughI]) troughI = i; });
    let peakI = 0; for (let i = 0; i < troughI; i++) if (vals[i] > vals[peakI]) peakI = i;
    const curvePath = NAV.map((d, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${cy(d.nav).toFixed(1)}`).join(' ');

    /* ── localization helpers ── */
    const slideKicker = (id: string) => {
        const ch = chapters.find(c => c.id === id);
        return ch ? `${ch.kicker} · ${ch.title}` : '';
    };
    const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const ES_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const locContract = (c: string): string => {
        if (lang === 'es') {
            return c.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/, m => ES_MONTHS[EN_MONTHS.indexOf(m)])
                .replace('(model)', '(modelo)');
        }
        if (lang === 'zh') {
            return c.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})/,
                (_, m, y) => `${y}年${EN_MONTHS.indexOf(m) + 1}月`)
                .replace('(model)', '（模型）');
        }
        return c;
    };

    /* ── slide content ── */
    const slideContent = (id: string) => {
        switch (id) {
            case 'hero': return (
                <div className="tm-ch-inner">
                    <div className="tm-eyebrow">{hero.eyebrow}</div>
                    <h1 className="tm-h1">{hero.h1a}<br /><em>{hero.h1b}</em></h1>
                    <p className="tm-sub">{hero.sub}</p>
                    <button className="tm-play" onClick={begin}>{hero.play}</button>
                    <div className="tm-hint">
                        {variant === 'narrated' ? hero.hintNarrated : hero.hintSilent}
                    </div>
                </div>
            );
            case 'ch1': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">{slideKicker('ch1')}</div>
                    <div className="tm-ch-title">{ui.ch1title}</div>
                    <div className="tm-fig amb">$133.50<small>{ui.ch1fig}</small></div>
                    <div className="tm-ticket">
                        <div className="tm-trow"><span className="k">{ui.contract}</span><span className="v">QQQ 2026-09-18 $465 Call</span></div>
                        <div className="tm-trow"><span className="k">{ui.positioning}</span><span className="v">{ui.ch1pos}</span></div>
                        <div className="tm-trow"><span className="k">{ui.entryChecklist}</span><span className="v hl">{ui.ch1check}</span></div>
                        <div className="tm-trow"><span className="k">{ui.fillSource}</span><span className="v hl">{ui.ch1src}</span></div>
                    </div>
                </div>
            );
            case 'compound': return (
                <div className="tm-ch-inner wide tm-comp-slide">
                    <div className="tm-kicker">{slideKicker('compound')}</div>
                    <div className="tm-ch-title">{ui.comptitle}</div>
                    <div className="tm-curve tm-comp-chart">
                        <svg viewBox={`0 0 ${cW} ${cH}`} role="img" aria-label={ui.compAria}>
                            {[10000, 20000, 30000, 40000, 50000].map(g => (
                                <g key={g}>
                                    <line x1={cPL} y1={cY(g)} x2={cW - cPR} y2={cY(g)} stroke="#262638" strokeWidth={1} />
                                    <text x={cPL - 8} y={cY(g) + 4} fill="#8B95A9" fontSize={cAxis} textAnchor="end" fontFamily="Inter">${g / 1000}k</text>
                                </g>
                            ))}
                            {cYears.map(t => (
                                <text key={t.y} x={cX(t.i)} y={cH - cPB + (narrow ? 24 : 20)} fill="#8B95A9" fontSize={cAxis} textAnchor="middle" fontFamily="Inter">{t.y}</text>
                            ))}
                            {/* QQQ's 2022 bear: ~25 months underwater */}
                            <rect x={cX(idxAt('2021-11-19'))} y={cPT} width={cX(idxAt('2023-12-15')) - cX(idxAt('2021-11-19'))} height={cH - cPT - cPB} fill="rgba(239,68,68,.06)" />
                            <text x={(cX(idxAt('2021-11-19')) + cX(idxAt('2023-12-15'))) / 2} y={cPT + (narrow ? 18 : 14)} fill="#E8A0A0" fontSize={cAxis} textAnchor="middle" fontFamily="Inter">{ui.compZone}</text>
                            <path d={cPath(cQqq)} fill="none" stroke="#9aa3b5" strokeWidth={narrow ? 2.2 : 1.8} opacity={0.9} pathLength={1}
                                style={{ strokeDasharray: 1, strokeDashoffset: curveDrawn ? 0 : 1, transition: 'stroke-dashoffset 3.2s ease-out' }} />
                            <path d={cPath(cStrat)} fill="none" stroke="#e0a458" strokeWidth={narrow ? 3 : 2.4} pathLength={1}
                                style={{ strokeDasharray: 1, strokeDashoffset: curveDrawn ? 0 : 1, transition: 'stroke-dashoffset 3.2s ease-out' }} />
                            {/* strategy's worst hole: -17.8%, recovered in 10 weeks */}
                            <circle cx={cX(idxAt('2023-10-26'))} cy={cY(cStrat[idxAt('2023-10-26')])} r={narrow ? 5 : 4} fill="#ef4444" />
                            <text x={cX(idxAt('2023-10-26'))} y={cY(cStrat[idxAt('2023-10-26')]) + (narrow ? 26 : 22)} fill="#E8A0A0" fontSize={cAxis} textAnchor="middle" fontFamily="Inter">{ui.compHole}</text>
                            <text x={cW - cPR} y={cY(cStrat[NAV.length - 1]) - (narrow ? 12 : 10)} fill="#e0a458" fontSize={narrow ? 17 : 15} fontWeight={700} textAnchor="end" fontFamily="Inter">$56,416</text>
                            <text x={cW - cPR} y={cY(cQqq[NAV.length - 1]) + (narrow ? 20 : 18)} fill="#9aa3b5" fontSize={narrow ? 16 : 14} textAnchor="end" fontFamily="Inter">$23,636</text>
                        </svg>
                    </div>
                    <div className="tm-map-legend">
                        <span><i style={{ background: '#e0a458' }} />{ui.mapLegendS}</span>
                        <span><i style={{ background: '#9aa3b5' }} />{ui.mapLegendQ}</span>
                    </div>
                    <p className="tm-caption">{ui.compCap}<b>{ui.compCapB}</b></p>
                </div>
            );
            case 'ch2': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">{slideKicker('ch2')}</div>
                    <div className="tm-ch-title">{ui.ch2title}</div>
                    <div className="tm-figrow">
                        <div className="tm-fig">~1:1<small>{ui.ch2a}</small></div>
                        <div className="tm-fig">1 yr+<small>{ui.ch2b}</small></div>
                        <div className="tm-fig amb">~¼<small>{ui.ch2c}</small></div>
                    </div>
                    <p className="tm-caption">{ui.ch2cap1}<b>{ui.ch2cap2}</b></p>
                </div>
            );
            case 'ch3': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">{slideKicker('ch3')}</div>
                    <div className="tm-ch-title">{ui.ch3title}</div>
                    <div className="tm-figrow">
                        <div className="tm-fig">392<small>{ui.ch3a}</small></div>
                        <div className="tm-fig pos">85%<small>{ui.ch3b}</small></div>
                        <div className="tm-fig pos">+$32,945<small>{ui.ch3c}</small></div>
                    </div>
                    <p className="tm-caption">{ui.ch3p1}<b>{ui.ch3p2}</b>{ui.ch3p3}<b>{ui.ch3p4}</b></p>
                </div>
            );
            case 'map': return (
                <div className="tm-ch-inner wide tm-map-slide">
                    <div className="tm-kicker">{slideKicker('map')}</div>
                    <div className="tm-ch-title">{ui.maptitle}</div>
                    <DecisionMap
                        key={lang}
                        audioRef={playerRef}
                        active={slideId === 'map' && playing}
                        forceDraw={slideId === 'map'}
                        beats={beats ?? undefined}
                        beatTimes={beatTimes}
                        legendQ={ui.mapLegendQ} legendS={ui.mapLegendS} idxNote={ui.mapIdx}
                        replayLabel={ui.replay} mapAria={ui.mapAria} replayAria={aria.replay}
                        onBeatView={(label) => track('map_beat_view', label, variant)}
                        onBeatOpen={(label) => track('map_beat_open', label, variant)}
                    />
                    <p className="tm-caption">{ui.mapCap1}<b>{ui.mapCap2}</b></p>
                </div>
            );
            case 'ch4': return (
                <div className="tm-ch-inner tm-dd-slide">
                    <div className="tm-kicker">{slideKicker('ch4')}</div>
                    <div className="tm-ch-title">{ui.ch4title}</div>
                    <div className="tm-figrow">
                        <div className="tm-fig">$62,103<small>{ui.ch4a}</small></div>
                        <div className="tm-fig neg">$51,067<small>{ui.ch4b}</small></div>
                        <div className="tm-fig neg">−17.8%<small>{ui.ch4c}</small></div>
                    </div>
                    <div className="tm-curve">
                        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ui.ch4aria}>
                            <rect x={cx(peakI)} y={P - 10} width={cx(troughI) - cx(peakI)} height={H - 2 * P + 20} rx={6} fill="rgba(224,92,92,.10)" />
                            <line x1={cx(troughI)} y1={cy(vals[troughI])} x2={cx(troughI)} y2={P - 10}
                                stroke="#e05c5c" strokeWidth={1} strokeDasharray="4 4" />
                            <path d={curvePath} fill="none" stroke="#e0a458" strokeWidth={narrow ? 3 : 2.2}
                                className={curveDrawn ? 'tm-curve-path drawn' : 'tm-curve-path'} />
                            <circle cx={cx(NAV.length - 1)} cy={cy(vals[vals.length - 1])} r={narrow ? 6 : 4} fill="#3fb97c" />
                            <text x={cx(troughI)} y={cy(vals[troughI]) + (narrow ? 30 : 22)} fill="#e05c5c" fontSize={troughFont} fontWeight={600} textAnchor="middle" fontFamily="Inter">−17.8%</text>
                            <text x={P} y={P - (narrow ? 12 : 14)} fill="#8B95A9" fontSize={axisFont} fontFamily="Inter">{ui.ch4from}</text>
                            <text x={W - P} y={P - (narrow ? 12 : 14)} fill="#8B95A9" fontSize={axisFont} textAnchor="end" fontFamily="Inter">{ui.ch4to}</text>
                        </svg>
                    </div>
                    <p className="tm-caption">{ui.ch4cap1}<b>−30.4%</b>{ui.ch4cap2}<b>{ui.ch4cap3}</b></p>
                </div>
            );
            case 'ch5': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">{slideKicker('ch5')}</div>
                    <div className="tm-ch-title">{ui.ch5title}</div>
                    <div className="tm-figrow">
                        <div className="tm-fig pos">+464.2%<small>{ui.ch5a}</small></div>
                        <div className="tm-fig">+136.4%<small>{ui.ch5b}</small></div>
                    </div>
                    <div className="tm-figrow">
                        <div className="tm-fig pos">−17.8%<small>{ui.ch5c}</small></div>
                        <div className="tm-fig neg">−35.6%<small>{ui.ch5d}</small></div>
                    </div>
                    <p className="tm-caption">{ui.ch5cap1}<b>{ui.ch5cap2}</b></p>
                </div>
            );
            case 'ch6': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">{slideKicker('ch6')}</div>
                    <div className="tm-ch-title">{ui.ch6title}</div>
                    <div className="tm-livecard">
                        <div className="tm-lrow"><span className="k">{ui.status}</span><span className="tm-pulse">{ui.livePaper}</span></div>
                        <div className="tm-lrow"><span className="k">{ui.since}</span><span className="tm-mono">{ui.sinceVal}</span></div>
                        <div className="tm-lrow"><span className="k">{ui.curPos}</span><span className="tm-mono">{ui.cash}</span></div>
                        <div className="tm-lrow"><span className="k">{ui.dips}</span><span className="tm-mono">0</span></div>
                        <div className="tm-lrow"><span className="k">{ui.gate}</span><span className="tm-mono">{ui.gateVal}</span></div>
                        <div className="tm-lrow"><span className="k">{ui.logged}</span><span className="tm-mono">{ui.loggedVal}</span></div>
                    </div>
                    <p className="tm-caption">{ui.ch6cap1}<b>{ui.ch6cap2}</b></p>
                </div>
            );
            case 'ch7': return (
                <div className="tm-ch-inner wide tm-scroll">
                    <div className="tm-kicker">{slideKicker('ch7')}</div>
                    <div className="tm-ch-title">{ui.ch7title.replace('{n}', String(LEDGER.length))}</div>
                    <p className="tm-caption" style={{ marginTop: -20 }}>{ui.ch7pre1}<b>{ui.ch7pre2}</b>{ui.ch7pre3}</p>
                    <div className="tm-tablewrap">
                        <table>
                            <thead>
                                <tr><th>{ledgerHead?.date ?? 'Date'}</th><th>{ledgerHead?.leg ?? 'Leg'}</th><th>{ledgerHead?.action ?? 'Action'}</th><th>{ledgerHead?.contract ?? 'Contract'}</th><th className="num">{ledgerHead?.qty ?? 'Qty'}</th><th className="num">{ledgerHead?.price ?? 'Price'}</th><th className="num">{ledgerHead?.pnl ?? 'P&L'}</th><th>{ledgerHead?.outcome ?? 'Outcome'}</th></tr>
                            </thead>
                            <tbody>
                                {LEDGER.map((r, i) => (
                                    <tr key={i}>
                                        <td className="muted">{r.ts}</td>
                                        <td><span className={`tm-tag ${r.kind === 'LEAPS' ? 'tm-tag-leaps' : 'tm-tag-cc'}`}>{ledgerTag?.[r.kind] ?? r.kind}</span></td>
                                        <td>{ledgerL?.actions[r.action] ?? r.action}</td>
                                        <td className="tm-mono">{locContract(r.contract)}</td>
                                        <td className="num tm-mono">{r.n}</td>
                                        <td className="num tm-mono">{r.px.toFixed(2)}</td>
                                        <td className={`num tm-mono ${r.pnl > 0 ? 'tm-pos' : r.pnl < 0 ? 'tm-neg' : 'muted'}`}>
                                            {r.pnl !== 0 ? `${r.pnl > 0 ? '+' : ''}${r.pnl.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="muted tm-reason">{ledgerL?.reasons[r.reason] ?? r.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
            case 'appendix': return (
                <div className="tm-ch-inner wide tm-scroll">
                    <div className="tm-kicker">{ui.appKicker}</div>
                    <div className="tm-ch-title">{ui.appTitle}</div>
                    <div className="tm-mgrid">
                        <div className="tm-mcard">
                            <div className="t">{ui.m1t}</div>
                            <p>{ui.m1p}</p>
                        </div>
                        <div className="tm-mcard">
                            <div className="t">{ui.m2t}</div>
                            <p>{ui.m2p}</p>
                        </div>
                        <div className="tm-mcard">
                            <div className="t">{ui.m3t}</div>
                            <p>{ui.m3p}</p>
                        </div>
                    </div>
                    <div className="tm-mtitle">{ui.wTitle}</div>
                    <p className="tm-msub">{ui.wSub}</p>
                    <div className="tm-tablewrap">
                        <table className="tm-wintable">
                            <thead>
                                <tr><th>{tableHead?.window ?? 'Window'}</th><th>{tableHead?.dates ?? 'Dates'}</th><th>{tableHead?.what ?? 'What it was'}</th>
                                    <th className="num">{tableHead?.strategy ?? 'Strategy'}</th><th className="num">{tableHead?.qqq ?? 'QQQ'}</th>
                                    <th className="num">{tableHead?.worstDip ?? 'Worst dip'}</th><th className="num">{tableHead?.fills ?? 'Fills'}</th></tr>
                            </thead>
                            <tbody>
                                {WINDOWS.map((w, i) => (
                                    <tr key={i}>
                                        <td>{windows?.[i]?.label ?? w.label}</td>
                                        <td className="muted tm-mono">{w.from.slice(5)} → {w.to.slice(5)}</td>
                                        <td className="muted">{windows?.[i]?.regime ?? w.regime}</td>
                                        <td className={`num tm-mono ${w.strat > 0 ? 'tm-pos' : w.strat < 0 ? 'tm-neg' : 'muted'}`}>{w.strat > 0 ? '+' : ''}{w.strat}%</td>
                                        <td className={`num tm-mono ${w.qqq > 0 ? 'tm-pos' : w.qqq < 0 ? 'tm-neg' : 'muted'}`}>{w.qqq > 0 ? '+' : ''}{w.qqq}%</td>
                                        <td className={`num tm-mono ${w.mdd < -5 ? 'tm-neg' : 'muted'}`}>{w.mdd}%</td>
                                        <td className="num tm-mono muted">{w.fills}</td>
                                    </tr>
                                ))}
                                <tr className="tm-winfull">
                                    <td><b>{fullWindowOv?.label ?? 'Full record'}</b></td>
                                    <td className="muted tm-mono">{ui.winFullDates}</td>
                                    <td className="muted">{fullWindowOv?.regime ?? FULL_WINDOW.regime}</td>
                                    <td className="num tm-mono tm-pos"><b>+{FULL_WINDOW.strat}%</b></td>
                                    <td className="num tm-mono">+{FULL_WINDOW.qqq}%</td>
                                    <td className="num tm-mono tm-neg">{FULL_WINDOW.mdd}%</td>
                                    <td className="num tm-mono muted">806</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="tm-caption">{ui.wCap1}<b>{ui.wCap2}</b></p>
                </div>
            );
            case 'close': return (
                <div className="tm-ch-inner wide tm-scroll">
                    <div className="tm-kicker">{ui.closeKicker}</div>
                    <div className="tm-ch-title">{ui.closeTitle}</div>
                    <div className="tm-disc tm-disc-slide">
                        <b>{ui.disc1}</b>{ui.disc1p}<br /><br />
                        <b>{ui.disc2}</b>{ui.disc2p}
                    </div>
                    <div className="tm-details">
                        <details>
                            <summary onClick={() => track(aria.transcriptOpen, undefined, variant)}>{ui.transcriptSummary}</summary>
                            {chapters.map(c => (
                                <div className="tm-t-ch" key={c.id}>
                                    <h4>{c.kicker} — {c.title}</h4>
                                    <p>{c.text}</p>
                                </div>
                            ))}
                        </details>
                    </div>
                    {onCta && (
                        <button className="tm-play" style={{ marginTop: 24 }}
                            onClick={() => { track('cta_click', undefined, variant); onCta(); }}>
                            {ctaText} →
                        </button>
                    )}
                </div>
            );
            default: return null;
        }
    };

    /* ── karaoke ticker words ── */
    const stripWords = slideChapter ? (words[slideId] || []) : [];
    const stripFallback = !slideChapter
        ? (slideId === 'hero' ? fallback.hero
            : slideId === 'appendix' ? fallback.appendix
            : fallback.close)
        : '';

    return (
        <div className="tm-story tm-deck">
            {/* ── top bar: rolling one-line transcript ── */}
            <div className="tm-deck-top">
                <div className={`tm-ticker ${variant === 'silent' ? 'static' : ''}`} ref={tickerRef}
                    aria-live={variant === 'narrated' ? 'off' : 'polite'}
                    aria-label={aria.transcript}>
                    <div className="tm-ticker-track" ref={tickerTrackRef}>
                        {slideChapter
                            ? stripWords.map((w, k) => (
                                <span key={k} className={
                                    variant === 'silent' ? ''
                                    : k === wordIdx ? 'cur'
                                    : k < wordIdx ? 'said' : ''
                                }>{w.w} </span>
                            ))
                            : <span className="tm-ticker-note">{stripFallback}</span>}
                    </div>
                </div>
            </div>

            {/* ── slide stage ── */}
            <div className="tm-deck-stage">
                {SLIDE_IDS.map((id, i) => (
                    <div key={id} className={`tm-slide ${i === slideIdx ? 'on' : ''}`} aria-hidden={i !== slideIdx}>
                        {slideContent(id)}
                    </div>
                ))}
            </div>

            {/* ── control bar ── */}
            <div className="tm-deck-bar">
                <div className="tm-deck-progress" style={{ width: `${progress * 100}%` }} />
                <div className="tm-deck-bar-row">
                    <button className="tm-nav" onClick={() => goTo(slideIdx - 1, { autoplay: started })}
                        disabled={slideIdx === 0} aria-label={aria.prev}>◀</button>
                    {variant === 'narrated' && (
                        <>
                            <button className={`tm-cbtn tm-playbar ${playing ? 'on' : ''}`} onClick={togglePlay}
                                aria-label={aria.playPause}>
                                {playing ? ui.pauseLbl : ui.playLbl}
                            </button>
                            <button className={`tm-cbtn ${muted ? 'on' : ''}`}
                                onClick={() => setMuted(m => { mutedRef.current = !m; return !m; })}
                                aria-label={aria.mute}>
                                {muted ? aria.muted : aria.sound}
                            </button>
                        </>
                    )}
                    <button className="tm-nav" onClick={() => goTo(slideIdx + 1, { autoplay: started })}
                        disabled={slideIdx === SLIDE_IDS.length - 1} aria-label={aria.next}>▶</button>
                    <div className="tm-dots">
                        {SLIDE_IDS.map((id, i) => (
                            <button key={id} className={`tm-dot ${i === slideIdx ? 'on' : ''} ${i < slideIdx ? 'done' : ''}`}
                                onClick={() => goTo(i, { autoplay: started })}
                                aria-label={`${aria.slide} ${i + 1}`} />
                        ))}
                    </div>
                    <div className="tm-counter tm-mono">{slideIdx + 1} / {SLIDE_IDS.length}</div>
                </div>
            </div>

            <audio ref={playerRef} preload="auto" muted={muted} />
        </div>
    );
}
