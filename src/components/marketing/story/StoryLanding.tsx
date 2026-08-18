'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CHAPTERS, NAV, LEDGER, WINDOWS, FULL_WINDOW, WORDS } from './storyData';
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

export function StoryLanding({ onCta, ctaLabel = 'Start your account' }: StoryLandingProps) {
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
    const slideChapter = CHAPTERS.find(c => c.id === slideId);

    /* ── navigation ── */
    const goTo = useCallback((idx: number, opts: { autoplay?: boolean } = {}) => {
        const i = Math.max(0, Math.min(SLIDE_IDS.length - 1, idx));
        slideIdxRef.current = i;
        setSlideIdx(i);
        setWordIdx(-1);
        setProgress(0);
        const id = SLIDE_IDS[i];
        track('slide_view', id, variant);
        const ch = CHAPTERS.find(c => c.id === id);
        const el = playerRef.current;
        if (ch && startedRef.current && narrationOn && el && (opts.autoplay ?? true)) {
            if (!el.src.endsWith(ch.audio)) el.src = ch.audio;
            el.play().catch(() => {});
            setPlaying(true);
        } else {
            el?.pause();
            setPlaying(false);
        }
    }, [narrationOn, variant]);

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
            const words = WORDS[id];
            if (words) {
                const t = el.currentTime;
                let wi = -1;
                for (let k = 0; k < words.length; k++) {
                    if (t >= words[k].s - 0.05) wi = k; else break;
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
    }, [variant, goTo]);

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
    useEffect(() => { if (slideId === 'ch4') setCurveDrawn(true); }, [slideId]);

    const W = 760, H = 300, P = 34;
    const vals = NAV.map(d => d.nav);
    const min = Math.min(...vals) * 0.985, max = Math.max(...vals) * 1.015;
    const cx = (i: number) => P + i * (W - 2 * P) / (NAV.length - 1);
    const cy = (v: number) => H - P - (v - min) / (max - min) * (H - 2 * P);
    let troughI = 0; vals.forEach((v, i) => { if (v < vals[troughI]) troughI = i; });
    let peakI = 0; for (let i = 0; i < troughI; i++) if (vals[i] > vals[peakI]) peakI = i;
    const curvePath = NAV.map((d, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${cy(d.nav).toFixed(1)}`).join(' ');

    /* ── slide content ── */
    const slideContent = (id: string) => {
        switch (id) {
            case 'hero': return (
                <div className="tm-ch-inner">
                    <div className="tm-eyebrow">TradeMind · QQQ LEAPS Strategy</div>
                    <h1 className="tm-h1">A track record,<br /><em>read aloud.</em></h1>
                    <p className="tm-sub">
                        Five and a half years of decisions — a bull market, a bear year in cash, a
                        correction, and every price along the way. No cherry-picking. No hype.
                    </p>
                    <button className="tm-play" onClick={begin}>▶ Begin the story</button>
                    <div className="tm-hint">
                        {variant === 'narrated'
                            ? `${SLIDE_IDS.length} slides · audio-synced · ~7 minutes · full transcript on the last slide`
                            : `${SLIDE_IDS.length} slides · a 7-minute read · full methodology inside`}
                    </div>
                </div>
            );
            case 'ch1': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 1 · A real trade</div>
                    <div className="tm-ch-title">September 2, 2025</div>
                    <div className="tm-fig amb">$133.50<small>mid-price fill · real exchange quote $131.00 / $136.00 · first entry of the final, tape-verified cycle</small></div>
                    <div className="tm-ticket">
                        <div className="tm-trow"><span className="k">Contract</span><span className="v">QQQ 2026-09-18 $465 Call</span></div>
                        <div className="tm-trow"><span className="k">Positioning</span><span className="v">Deep in the money · ~1 year to expiry</span></div>
                        <div className="tm-trow"><span className="k">Entry checklist</span><span className="v hl">5 gates — momentum · trend · volatility · regime · ML — all green</span></div>
                        <div className="tm-trow"><span className="k">Fill source</span><span className="v hl">OPRA tape, mid-price, commission included</span></div>
                    </div>
                </div>
            );
            case 'ch2': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 2 · The engine</div>
                    <div className="tm-ch-title">One contract, a hundred shares</div>
                    <div className="tm-figrow">
                        <div className="tm-fig">~1:1<small>dollar-for-dollar with QQQ</small></div>
                        <div className="tm-fig">1 yr+<small>of time for the thesis to work</small></div>
                        <div className="tm-fig amb">~¼<small>of the cost of shares outright</small></div>
                    </div>
                    <p className="tm-caption">Leverage with a defined cost and no margin loan. <b>When QQQ falls, this falls faster.</b></p>
                </div>
            );
            case 'ch3': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 3 · The overlay</div>
                    <div className="tm-ch-title">Winning often ≠ winning</div>
                    <div className="tm-figrow">
                        <div className="tm-fig">392<small>covered-call trades · 5.6 years</small></div>
                        <div className="tm-fig pos">85%<small>win rate</small></div>
                        <div className="tm-fig pos">+$32,945<small>net result of the overlay</small></div>
                    </div>
                    <p className="tm-caption">The data also taught us when <b>not</b> to sell: strong trend + thin premium = no sale — a rule tested in public, adopted after 21 out-of-sample trials. And still: on the real tape, the final 15 months' overlay lost $1,776 net. <b>Every loss is in the ledger.</b></p>
                </div>
            );
            case 'map': return (
                <div className="tm-ch-inner wide">
                    <div className="tm-kicker">Chapter 4 · The map</div>
                    <div className="tm-ch-title">Five and a half years, every decision</div>
                    <DecisionMap
                        audioRef={playerRef}
                        active={slideId === 'map' && playing}
                        forceDraw={slideId === 'map'}
                        onBeatView={(label) => track('map_beat_view', label, variant)}
                        onBeatOpen={(label) => track('map_beat_open', label, variant)}
                    />
                    <p className="tm-caption">Tap any marker for the actual fill. <b>The losses are annotated too — they are part of the record.</b></p>
                </div>
            );
            case 'ch4': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 5 · The drawdown</div>
                    <div className="tm-ch-title">Autumn 2023, lived day by day</div>
                    <div className="tm-figrow">
                        <div className="tm-fig">$62,103<small>September 5, 2023 — the peak</small></div>
                        <div className="tm-fig neg">$51,067<small>October 26 — seven weeks later</small></div>
                        <div className="tm-fig neg">−17.8%<small>maximum drawdown · model-priced years</small></div>
                    </div>
                    <div className="tm-curve">
                        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Strategy equity curve, January 2021 to August 2026">
                            <rect x={cx(peakI)} y={P - 10} width={cx(troughI) - cx(peakI)} height={H - 2 * P + 20} rx={6} fill="rgba(224,92,92,.10)" />
                            <line x1={cx(troughI)} y1={cy(vals[troughI])} x2={cx(troughI)} y2={P - 10}
                                stroke="#e05c5c" strokeWidth={1} strokeDasharray="4 4" />
                            <path d={curvePath} fill="none" stroke="#e0a458" strokeWidth={2.2}
                                className={curveDrawn ? 'tm-curve-path drawn' : 'tm-curve-path'} />
                            <circle cx={cx(NAV.length - 1)} cy={cy(vals[vals.length - 1])} r={4} fill="#3fb97c" />
                            <text x={cx(troughI)} y={cy(vals[troughI]) + 22} fill="#e05c5c" fontSize={11.5} textAnchor="middle" fontFamily="Inter">−17.8%</text>
                            <text x={P} y={P - 14} fill="#5c6577" fontSize={11} fontFamily="Inter">Jan 2021</text>
                            <text x={W - P} y={P - 14} fill="#5c6577" fontSize={11} textAnchor="end" fontFamily="Inter">Aug 2026 · $169,249</text>
                        </svg>
                    </div>
                    <p className="tm-caption">The model that prices the early years smooths the storms — on the real tape, March 2026 measured <b>−30.4%</b>. Both numbers stay on this page, because both are true. <b>The next drawdown could be deeper — the recovery is never owed to you.</b></p>
                </div>
            );
            case 'ch5': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 6 · The honest comparison</div>
                    <div className="tm-ch-title">Us vs. simply buying QQQ</div>
                    <div className="tm-figrow">
                        <div className="tm-fig pos">+464.2%<small>strategy · 5.6 years</small></div>
                        <div className="tm-fig">+136.4%<small>QQQ buy &amp; hold</small></div>
                    </div>
                    <div className="tm-figrow">
                        <div className="tm-fig pos">−17.8%<small>our worst hole</small></div>
                        <div className="tm-fig neg">−35.6%<small>QQQ's worst hole</small></div>
                    </div>
                    <p className="tm-caption">Sharpe ratio: 1.48 vs 0.80. We won on every measure over this window — <b>and that is exactly why you should be skeptical. Five years is one set of weather; the next bear will not look like the last one.</b></p>
                </div>
            );
            case 'ch6': return (
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 7 · Live, right now</div>
                    <div className="tm-ch-title">The record being written</div>
                    <div className="tm-livecard">
                        <div className="tm-lrow"><span className="k">Status</span><span className="tm-pulse">Live paper trading · IBKR</span></div>
                        <div className="tm-lrow"><span className="k">Since</span><span className="tm-mono">August 1, 2026</span></div>
                        <div className="tm-lrow"><span className="k">Current position</span><span className="tm-mono">100% cash</span></div>
                        <div className="tm-lrow"><span className="k">Qualifying dips so far</span><span className="tm-mono">0</span></div>
                        <div className="tm-lrow"><span className="k">Overlay gate</span><span className="tm-mono">Trend × premium rule — live since Aug 17, 2026</span></div>
                        <div className="tm-lrow"><span className="k">Decisions logged</span><span className="tm-mono">Every trading day, in public</span></div>
                    </div>
                    <p className="tm-caption">Patience is the strategy. When it acts, you see it the same time we do. <b>Live results may be better or worse than anything simulated.</b></p>
                </div>
            );
            case 'ch7': return (
                <div className="tm-ch-inner wide tm-scroll">
                    <div className="tm-kicker">Chapter 8 · Judge for yourself</div>
                    <div className="tm-ch-title">All {LEDGER.length} fills. Nothing hidden.</div>
                    <p className="tm-caption" style={{ marginTop: -20 }}>Every fill in this ledger is <b>model-priced</b> (Black-Scholes on VIX-implied volatility, $1/contract; modeled strikes shown rounded to the nearest dollar, fixed-tenor expiries shown by month). The final 15 months were independently re-run on the real OPRA tape — see the appendix.</p>
                    <div className="tm-tablewrap">
                        <table>
                            <thead>
                                <tr><th>Date</th><th>Leg</th><th>Action</th><th>Contract</th><th className="num">Qty</th><th className="num">Price</th><th className="num">P&amp;L</th><th>Outcome</th></tr>
                            </thead>
                            <tbody>
                                {LEDGER.map((r, i) => (
                                    <tr key={i}>
                                        <td className="muted">{r.ts}</td>
                                        <td><span className={`tm-tag ${r.kind === 'LEAPS' ? 'tm-tag-leaps' : 'tm-tag-cc'}`}>{r.kind}</span></td>
                                        <td>{r.action}</td>
                                        <td className="tm-mono">{r.contract}</td>
                                        <td className="num tm-mono">{r.n}</td>
                                        <td className="num tm-mono">{r.px.toFixed(2)}</td>
                                        <td className={`num tm-mono ${r.pnl > 0 ? 'tm-pos' : r.pnl < 0 ? 'tm-neg' : 'muted'}`}>
                                            {r.pnl !== 0 ? `${r.pnl > 0 ? '+' : ''}${r.pnl.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="muted tm-reason">{r.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
            case 'appendix': return (
                <div className="tm-ch-inner wide tm-scroll">
                    <div className="tm-kicker">Appendix · How the record is made</div>
                    <div className="tm-ch-title">How we backtest — and how the strategy earns changes</div>
                    <div className="tm-mgrid">
                        <div className="tm-mcard">
                            <div className="t">Two pricing layers, both disclosed</div>
                            <p>2021 – May 2025: model-priced fills — Black-Scholes on VIX-implied volatility,
                            $1/contract commissions, modeled strikes (shown rounded) and fixed-tenor expiries.
                            June 2025 – Aug 2026: independently re-run on the real OPRA NBBO tape via Databento —
                            mid-price fills on actual listed contracts, real listed expirations, $0.65/contract.</p>
                        </div>
                        <div className="tm-mcard">
                            <div className="t">The fidelity cross-check</div>
                            <p>The same final 15 months, both engines. Model-priced: +61.1%, worst dip −11.7%.
                            Real tape: +83.9%, worst dip −30.4%. The model understates the storms —
                            which is why every drawdown number on this page says which engine measured it.</p>
                        </div>
                        <div className="tm-mcard">
                            <div className="t">Ideas earn their place</div>
                            <p>Improvements are tested as walk-forward experiments — trained on past data, judged
                            on 21 out-of-sample paths, and adopted only if they clear a strict bar. The overlay's
                            trend × premium gate cleared it (18 of 21) and went live August 17, 2026.
                            Ideas that fail get rejected in public.</p>
                        </div>
                    </div>
                    <div className="tm-mtitle">The same tape, different windows</div>
                    <p className="tm-msub">No strategy wins every month. Here is the full record broken into its
                    regimes — including the windows where buy-and-hold was the better seat.</p>
                    <div className="tm-tablewrap">
                        <table className="tm-wintable">
                            <thead>
                                <tr><th>Window</th><th>Dates</th><th>What it was</th>
                                    <th className="num">Strategy</th><th className="num">QQQ</th>
                                    <th className="num">Worst dip</th><th className="num">Fills</th></tr>
                            </thead>
                            <tbody>
                                {WINDOWS.map((w, i) => (
                                    <tr key={i}>
                                        <td>{w.label}</td>
                                        <td className="muted tm-mono">{w.from.slice(5)} → {w.to.slice(5)}</td>
                                        <td className="muted">{w.regime}</td>
                                        <td className={`num tm-mono ${w.strat > 0 ? 'tm-pos' : w.strat < 0 ? 'tm-neg' : 'muted'}`}>{w.strat > 0 ? '+' : ''}{w.strat}%</td>
                                        <td className={`num tm-mono ${w.qqq > 0 ? 'tm-pos' : w.qqq < 0 ? 'tm-neg' : 'muted'}`}>{w.qqq > 0 ? '+' : ''}{w.qqq}%</td>
                                        <td className={`num tm-mono ${w.mdd < -5 ? 'tm-neg' : 'muted'}`}>{w.mdd}%</td>
                                        <td className="num tm-mono muted">{w.fills}</td>
                                    </tr>
                                ))}
                                <tr className="tm-winfull">
                                    <td><b>Full record</b></td>
                                    <td className="muted tm-mono">Jan 2021 → Aug 2026</td>
                                    <td className="muted">{FULL_WINDOW.regime}</td>
                                    <td className="num tm-mono tm-pos"><b>+{FULL_WINDOW.strat}%</b></td>
                                    <td className="num tm-mono">+{FULL_WINDOW.qqq}%</td>
                                    <td className="num tm-mono tm-neg">{FULL_WINDOW.mdd}%</td>
                                    <td className="num tm-mono muted">806</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="tm-caption">Same simulation, same rules — just sliced. <b>The two-year grind is the
                    window where buy-and-hold beat us (+41.7% vs +38.7%). It stays in the table.</b></p>
                </div>
            );
            case 'close': return (
                <div className="tm-ch-inner tm-scroll">
                    <div className="tm-kicker">The fine print, in the open</div>
                    <div className="tm-ch-title">Methodology &amp; disclosures</div>
                    <div className="tm-disc tm-disc-slide">
                        <b>Methodology.</b> Simulation January 4, 2021 – August 14, 2026. 2021 – May 2025 fills are
                        model-priced: Black-Scholes on VIX-implied volatility, $1/contract commissions, modeled strikes
                        (shown rounded to the nearest dollar) and fixed-tenor expiries — not listed contracts.
                        June 2025 – August 14, 2026 was independently re-run on real OPRA NBBO quotes (Databento):
                        mid-price fills on the actual listed contract at each decision bar, real listed expirations,
                        $0.65/contract — that 15-month segment returned +83.9% with a −30.4% maximum drawdown
                        (model engine for the same window: +61.1%, −11.7%). Live layer: IBKR paper account, decisions
                        logged daily since August 1, 2026.<br /><br />
                        <b>Simulated performance. The final fifteen months are as close to live as a backtest gets —
                        real quotes, mid-price fills. Past performance — simulated or live — does not guarantee future
                        results.</b> Options involve substantial risk and are not suitable
                        for every investor; you can lose your entire investment. TradeMind never connects to or submits
                        orders to your brokerage — signals only help you enter the order yourself. This page is educational
                        material, not investment advice or a solicitation.
                    </div>
                    <div className="tm-details">
                        <details>
                            <summary onClick={() => track('transcript_open', undefined, variant)}>Full narration transcript</summary>
                            {CHAPTERS.map(c => (
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
                            {ctaLabel} →
                        </button>
                    )}
                </div>
            );
            default: return null;
        }
    };

    /* ── karaoke ticker words ── */
    const stripWords = slideChapter ? (WORDS[slideId] || []) : [];
    const stripFallback = !slideChapter
        ? (slideId === 'hero' ? 'Press play to begin the story.'
            : slideId === 'appendix' ? 'How the record is made — methodology and regime windows.'
            : 'Methodology, disclosures, and the full transcript.')
        : '';

    return (
        <div className="tm-story tm-deck">
            {/* ── top bar: rolling one-line transcript ── */}
            <div className="tm-deck-top">
                <div className={`tm-ticker ${variant === 'silent' ? 'static' : ''}`} ref={tickerRef}
                    aria-live={variant === 'narrated' ? 'off' : 'polite'}
                    aria-label="Narration transcript">
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
                        disabled={slideIdx === 0} aria-label="Previous slide">◀</button>
                    {variant === 'narrated' && (
                        <>
                            <button className={`tm-cbtn tm-playbar ${playing ? 'on' : ''}`} onClick={togglePlay}
                                aria-label="Play or pause narration">
                                {playing ? '❚❚ Pause' : '▶ Play'}
                            </button>
                            <button className={`tm-cbtn ${muted ? 'on' : ''}`}
                                onClick={() => setMuted(m => { mutedRef.current = !m; return !m; })}
                                aria-label="Mute narration">
                                {muted ? 'Muted' : 'Sound on'}
                            </button>
                        </>
                    )}
                    <button className="tm-nav" onClick={() => goTo(slideIdx + 1, { autoplay: started })}
                        disabled={slideIdx === SLIDE_IDS.length - 1} aria-label="Next slide">▶</button>
                    <div className="tm-dots">
                        {SLIDE_IDS.map((id, i) => (
                            <button key={id} className={`tm-dot ${i === slideIdx ? 'on' : ''} ${i < slideIdx ? 'done' : ''}`}
                                onClick={() => goTo(i, { autoplay: started })}
                                aria-label={`Slide ${i + 1}`} />
                        ))}
                    </div>
                    <div className="tm-counter tm-mono">{slideIdx + 1} / {SLIDE_IDS.length}</div>
                </div>
            </div>

            <audio ref={playerRef} preload="auto" muted={muted} />
        </div>
    );
}
