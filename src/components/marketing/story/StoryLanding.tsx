'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CHAPTERS, NAV, LEDGER, WINDOWS, FULL_WINDOW } from './storyData';
import { DecisionMap } from './DecisionMap';

/* ─────────────────────────────────────────────────────────────────────────────
   StoryLanding — "A track record, read aloud."
   Scroll-synced narrated scrollytelling over the 15-month real-tape simulation
   + live paper record. Design rules applied from deep research:
     · user-gesture start (iOS autoplay is absolute)
     · narration never duplicates on-screen text (redundancy effect)
     · risk disclosures SPOKEN in the audio, not just shown (FINRA audio guidance)
     · full transcript present but collapsed (WCAG 1.2.1 + SEO, no redundancy penalty)
     · instrumented as an experiment (chapter completion / scroll depth / A-B)
   ─────────────────────────────────────────────────────────────────────────── */

interface StoryLandingProps {
    onCta?: () => void;      // parent wires this to Privy login / pricing scroll
    ctaLabel?: string;
}

type Variant = 'narrated' | 'silent';

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
    const [started, setStarted] = useState(false);
    const [muted, setMuted] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [chapterLabel, setChapterLabel] = useState('');
    const [currentCh, setCurrentCh] = useState<string | null>(null);
    const [visible, setVisible] = useState<Set<string>>(new Set());
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
    const currentChRef = useRef<string | null>(null);
    const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
    const startedRef = useRef(false);
    const mutedRef = useRef(false);

    const narrationOn = variant === 'narrated' && !muted;

    /* ── audio chapter control ── */
    const playChapter = useCallback((id: string) => {
        if (!narrationOn) return;
        const ch = CHAPTERS.find(c => c.id === id);
        if (!ch) return;
        const el = playerRef.current;
        if (!el) return;
        if (currentChRef.current === id && !el.paused) return;
        currentChRef.current = id;
        if (!el.src.endsWith(ch.audio)) el.src = ch.audio;
        el.play().catch(() => {});
        setPlaying(true);
        setChapterLabel(ch.kicker);
        setCurrentCh(id);
    }, [narrationOn]);

    const pause = useCallback(() => {
        playerRef.current?.pause();
        setPlaying(false);
    }, []);

    // track chapter completion + auto-advance to the next chapter
    useEffect(() => {
        const el = playerRef.current;
        if (!el) return;
        const onEnd = () => {
            const id = currentChRef.current;
            if (id) track('chapter_complete', id, variant);
            setPlaying(false);
            // Guided-tour: when a chapter's narration ends, scroll to the next
            // chapter — the IntersectionObserver starts its audio after the dwell.
            if (!id || !startedRef.current || mutedRef.current) return;
            const idx = CHAPTERS.findIndex(c => c.id === id);
            if (idx < 0 || idx >= CHAPTERS.length - 1) return;
            // Don't fight the user: only advance if the ending chapter is still on screen.
            const cur = sectionRefs.current.get(id);
            if (cur) {
                const r = cur.getBoundingClientRect();
                if (!(r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.25)) return;
            }
            sectionRefs.current.get(CHAPTERS[idx + 1].id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        el.addEventListener('ended', onEnd);
        return () => el.removeEventListener('ended', onEnd);
    }, [variant]);

    /* ── scroll → chapter detection (600ms dwell so fast scrolling doesn't fight audio) ── */
    useEffect(() => {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                const id = (e.target as HTMLElement).dataset.chapter;
                if (!id) return;
                if (e.isIntersecting) {
                    setVisible(prev => new Set(prev).add(id));
                    track('chapter_view', id, variant);
                    if (started) {
                        if (dwellRef.current) clearTimeout(dwellRef.current);
                        dwellRef.current = setTimeout(() => {
                            const r = e.target.getBoundingClientRect();
                            if (r.top < window.innerHeight * 0.55 && r.bottom > window.innerHeight * 0.45) {
                                playChapter(id);
                            }
                        }, 600);
                    }
                }
            });
        }, { threshold: 0.4 });
        sectionRefs.current.forEach(el => io.observe(el));
        return () => io.disconnect();
    }, [started, playChapter, variant]);

    const begin = () => {
        setStarted(true);
        startedRef.current = true;
        track('story_start', undefined, variant);
        document.getElementById('tm-ch1')?.scrollIntoView({ behavior: 'smooth' });
    };

    const setRef = (id: string) => (el: HTMLElement | null) => {
        if (el) sectionRefs.current.set(id, el);
    };

    // Silent A/B arm: identical content, carried as on-screen text instead of audio.
    const storyText = (id: string) => {
        if (variant !== 'silent') return null;
        const ch = CHAPTERS.find(c => c.id === id);
        return ch ? <p className="tm-storytext">{ch.text}</p> : null;
    };

    /* ── equity curve ── */
    const curveRef = useRef<SVGSVGElement | null>(null);
    const [curveDrawn, setCurveDrawn] = useState(false);
    useEffect(() => {
        if (!visible.has('ch4') || curveDrawn) return;
        setCurveDrawn(true);
    }, [visible, curveDrawn]);

    const W = 760, H = 300, P = 34;
    const vals = NAV.map(d => d.nav);
    const min = Math.min(...vals) * 0.985, max = Math.max(...vals) * 1.015;
    const cx = (i: number) => P + i * (W - 2 * P) / (NAV.length - 1);
    const cy = (v: number) => H - P - (v - min) / (max - min) * (H - 2 * P);
    let troughI = 0; vals.forEach((v, i) => { if (v < vals[troughI]) troughI = i; });
    let peakI = 0; for (let i = 0; i < troughI; i++) if (vals[i] > vals[peakI]) peakI = i;
    const curvePath = NAV.map((d, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${cy(d.nav).toFixed(1)}`).join(' ');

    return (
        <div className="tm-story">
            {/* ── sticky story controls ── */}
            <div className="tm-story-controls">
                <span className="tm-ch-label">{chapterLabel}</span>
                {variant === 'narrated' && (
                    <>
                        <button
                            className={`tm-cbtn ${playing ? 'on' : ''}`}
                            onClick={() => {
                                if (!started) { begin(); return; }
                                if (playing) pause();
                                else if (currentChRef.current) playChapter(currentChRef.current);
                                else playChapter('ch1');
                            }}
                            aria-label="Play or pause narration"
                        >
                            {playing ? '❚❚ Pause' : '▶ Listen'}
                        </button>
                        <button
                            className={`tm-cbtn ${muted ? 'on' : ''}`}
                            onClick={() => setMuted(m => { mutedRef.current = !m; return !m; })}
                            aria-label="Mute narration"
                        >
                            {muted ? 'Muted' : 'Sound on'}
                        </button>
                    </>
                )}
                <button
                    className="tm-cbtn"
                    onClick={() => {
                        track('transcript_open', undefined, variant);
                        document.getElementById('tm-transcript')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const d = document.getElementById('tm-transcript-details') as HTMLDetailsElement | null;
                        if (d) d.open = true;
                    }}
                >
                    Transcript
                </button>
            </div>

            {/* ── hero ── */}
            <section className="tm-hero">
                <div className="tm-eyebrow">TradeMind · QQQ LEAPS Strategy</div>
                <h1 className="tm-h1">A track record,<br /><em>read aloud.</em></h1>
                <p className="tm-sub">
                    Fifteen months of decisions — every entry, every loss, every price from the real
                    exchange tape. No cherry-picking. No hype.{variant === 'narrated' ? ' Press play, then scroll.' : ''}
                </p>
                <button className="tm-play" onClick={begin}>▶ Begin the story</button>
                <div className="tm-hint">
                    {variant === 'narrated'
                        ? 'Press play once — the story scrolls itself · 4½ minutes · full transcript available'
                        : 'A 4½-minute read · full methodology below'}
                </div>
            </section>

            {/* ── CH 1: a real trade ── */}
            <section id="tm-ch1" data-chapter="ch1" ref={setRef('ch1')}
                className={`tm-chapter ${visible.has('ch1') ? 'vis' : ''}`}>
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 1 · A real trade</div>
                    <div className="tm-ch-title">September 2, 2025</div>
                    <div className="tm-fig amb">$133.50<small>mid-price fill · real exchange quote $131.00 / $136.00</small></div>
                    <div className="tm-ticket">
                        <div className="tm-trow"><span className="k">Contract</span><span className="v">QQQ 2026-09-18 $465 Call</span></div>
                        <div className="tm-trow"><span className="k">Positioning</span><span className="v">Deep in the money · ~1 year to expiry</span></div>
                        <div className="tm-trow"><span className="k">Entry checklist</span><span className="v hl">5 gates — momentum · trend · volatility · regime · ML — all green</span></div>
                        <div className="tm-trow"><span className="k">Fill source</span><span className="v hl">OPRA tape, mid-price, commission included</span></div>
                    </div>
                    {storyText('ch1')}
                </div>
            </section>

            {/* ── CH 2: the engine ── */}
            <section id="tm-ch2" data-chapter="ch2" ref={setRef('ch2')}
                className={`tm-chapter ${visible.has('ch2') ? 'vis' : ''}`}>
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 2 · The engine</div>
                    <div className="tm-ch-title">One contract, a hundred shares</div>
                    <div className="tm-figrow">
                        <div className="tm-fig">~1:1<small>dollar-for-dollar with QQQ</small></div>
                        <div className="tm-fig">1 yr+<small>of time for the thesis to work</small></div>
                        <div className="tm-fig amb">~¼<small>of the cost of shares outright</small></div>
                    </div>
                    <p className="tm-caption">Leverage with a defined cost and no margin loan. <b>When QQQ falls, this falls faster.</b></p>
                    {storyText('ch2')}
                </div>
            </section>

            {/* ── CH 3: the overlay ── */}
            <section id="tm-ch3" data-chapter="ch3" ref={setRef('ch3')}
                className={`tm-chapter ${visible.has('ch3') ? 'vis' : ''}`}>
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 3 · The overlay</div>
                    <div className="tm-ch-title">Winning often ≠ winning</div>
                    <div className="tm-figrow">
                        <div className="tm-fig">149<small>covered-call trades</small></div>
                        <div className="tm-fig pos">74%<small>win rate</small></div>
                        <div className="tm-fig neg">−$6,874<small>net result of the overlay</small></div>
                    </div>
                    <p className="tm-caption">Small wins, larger losses, in a rally that kept blowing through the strikes we sold. <b>Every one of those losses is in the ledger below.</b></p>
                    {storyText('ch3')}
                </div>
            </section>

            {/* ── CH 4: the map — QQQ vs portfolio, every decision annotated ── */}
            <section id="tm-map" data-chapter="map" ref={setRef('map')}
                className={`tm-chapter ${visible.has('map') ? 'vis' : ''}`}>
                <div className="tm-ch-inner wide">
                    <div className="tm-kicker">Chapter 4 · The map</div>
                    <div className="tm-ch-title">Fifteen months, every decision</div>
                    <DecisionMap
                        audioRef={playerRef}
                        active={currentCh === 'map' && playing}
                        onBeatView={(label) => track('map_beat_view', label, variant)}
                        onBeatOpen={(label) => track('map_beat_open', label, variant)}
                    />
                    <p className="tm-caption">Tap any marker for the actual fill. <b>The losses are annotated too — they are part of the record.</b></p>
                    {storyText('map')}
                </div>
            </section>

            {/* ── CH 5: the drawdown ── */}
            <section id="tm-ch4" data-chapter="ch4" ref={setRef('ch4')}
                className={`tm-chapter tm-dark ${visible.has('ch4') ? 'vis' : ''}`}>
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 5 · The drawdown</div>
                    <div className="tm-ch-title">March 2026, lived day by day</div>
                    <div className="tm-figrow">
                        <div className="tm-fig">$30,000<small>January value</small></div>
                        <div className="tm-fig neg">$25,259<small>March 30 — six weeks later</small></div>
                        <div className="tm-fig neg">−30.4%<small>maximum drawdown</small></div>
                    </div>
                    <div className="tm-curve">
                        <svg ref={curveRef} viewBox={`0 0 ${W} ${H}`} role="img"
                            aria-label="Strategy equity curve, June 2025 to August 2026">
                            <rect x={cx(peakI)} y={P - 10} width={cx(troughI) - cx(peakI)} height={H - 2 * P + 20} rx={6} fill="rgba(224,92,92,.10)" />
                            <line x1={cx(troughI)} y1={cy(vals[troughI])} x2={cx(troughI)} y2={P - 10}
                                stroke="#e05c5c" strokeWidth={1} strokeDasharray="4 4" />
                            <path d={curvePath} fill="none" stroke="#e0a458" strokeWidth={2.2}
                                className={curveDrawn ? 'tm-curve-path drawn' : 'tm-curve-path'} />
                            <circle cx={cx(NAV.length - 1)} cy={cy(vals[vals.length - 1])} r={4} fill="#3fb97c" />
                            <text x={cx(troughI)} y={cy(vals[troughI]) + 22} fill="#e05c5c" fontSize={11.5} textAnchor="middle" fontFamily="Inter">−30.4%</text>
                            <text x={P} y={P - 14} fill="#5c6577" fontSize={11} fontFamily="Inter">Jun 2025</text>
                            <text x={W - P} y={P - 14} fill="#5c6577" fontSize={11} textAnchor="end" fontFamily="Inter">Aug 2026 · $50,078</text>
                        </svg>
                    </div>
                    <p className="tm-caption">The system followed its rules. QQQ came back. <b>The next drawdown could be deeper — the recovery is never owed to you.</b></p>
                    {storyText('ch4')}
                </div>
            </section>

            {/* ── CH 5: the honest comparison ── */}
            <section id="tm-ch5" data-chapter="ch5" ref={setRef('ch5')}
                className={`tm-chapter ${visible.has('ch5') ? 'vis' : ''}`}>
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 6 · The honest comparison</div>
                    <div className="tm-ch-title">Us vs. simply buying QQQ</div>
                    <div className="tm-figrow">
                        <div className="tm-fig pos">+66.9%<small>strategy · 15 months</small></div>
                        <div className="tm-fig">+39.7%<small>QQQ buy &amp; hold</small></div>
                    </div>
                    <div className="tm-figrow">
                        <div className="tm-fig neg">1.29<small>our Sharpe ratio</small></div>
                        <div className="tm-fig pos">1.60<small>QQQ Sharpe ratio</small></div>
                    </div>
                    <p className="tm-caption">More return. Less smoothness. Real risk of loss. <b>That trade-off is not for everyone — and it is the whole story.</b></p>
                    {storyText('ch5')}
                </div>
            </section>

            {/* ── CH 6: live ── */}
            <section id="tm-ch6" data-chapter="ch6" ref={setRef('ch6')}
                className={`tm-chapter ${visible.has('ch6') ? 'vis' : ''}`}>
                <div className="tm-ch-inner">
                    <div className="tm-kicker">Chapter 7 · Live, right now</div>
                    <div className="tm-ch-title">The record being written</div>
                    <div className="tm-livecard">
                        <div className="tm-lrow"><span className="k">Status</span><span className="tm-pulse">Live paper trading · IBKR</span></div>
                        <div className="tm-lrow"><span className="k">Since</span><span className="tm-mono">August 1, 2026</span></div>
                        <div className="tm-lrow"><span className="k">Current position</span><span className="tm-mono">100% cash</span></div>
                        <div className="tm-lrow"><span className="k">Qualifying dips so far</span><span className="tm-mono">0</span></div>
                        <div className="tm-lrow"><span className="k">Decisions logged</span><span className="tm-mono">Every trading day, in public</span></div>
                    </div>
                    <p className="tm-caption">Patience is the strategy. When it acts, you see it the same time we do. <b>Live results may be better or worse than anything simulated.</b></p>
                    {storyText('ch6')}
                </div>
            </section>

            {/* ── CH 7: the ledger ── */}
            <section id="tm-ch7" data-chapter="ch7" ref={setRef('ch7')}
                className={`tm-chapter tm-ledger ${visible.has('ch7') ? 'vis' : ''}`}>
                <div className="tm-ch-inner wide">
                    <div className="tm-kicker">Chapter 8 · Judge for yourself</div>
                    <div className="tm-ch-title">All {LEDGER.length} fills. Nothing hidden.</div>
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
                    {storyText('ch7')}
                    {onCta && (
                        <button className="tm-play" style={{ marginTop: 40 }}
                            onClick={() => { track('cta_click', undefined, variant); onCta(); }}>
                            {ctaLabel} →
                        </button>
                    )}
                </div>
            </section>

            {/* ── methodology appendix (opt-in, not narrated) ── */}
            <section className="tm-chapter tm-method">
                <div className="tm-ch-inner wide">
                    <div className="tm-kicker">Appendix · How the record is made</div>
                    <div className="tm-ch-title">How we backtest — and how the strategy earns changes</div>

                    <div className="tm-mgrid">
                        <div className="tm-mcard">
                            <div className="t">Real tape, not theory</div>
                            <p>Every decision uses actual exchange quotes — the OPRA NBBO feed, via Databento.
                            Fills are simulated at the mid-price of the actual listed contract at each decision
                            moment, with $0.65/contract commissions. No idealized pricing. 303 of 305 fills are
                            priced directly from the tape; 2 used a model fallback and are marked in the ledger.</p>
                        </div>
                        <div className="tm-mcard">
                            <div className="t">Rules fixed before the run</div>
                            <p>The entry gates, overlay rules, and risk limits are defined first — then the
                            simulation runs through 15 months with no hindsight adjustments inside the run.
                            A result is only believable if the rules never peeked at the future.</p>
                        </div>
                        <div className="tm-mcard">
                            <div className="t">Ideas earn their place</div>
                            <p>Improvements are tested as walk-forward experiments — trained on past data, judged
                            on data the idea has never seen, and adopted only if they clear a strict performance
                            bar out-of-sample. Ideas that fail get rejected in public, not quietly tuned until
                            they pass.</p>
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
                                    <td className="muted tm-mono">Jun 2025 → Aug 2026</td>
                                    <td className="muted">{FULL_WINDOW.regime}</td>
                                    <td className="num tm-mono tm-pos"><b>+{FULL_WINDOW.strat}%</b></td>
                                    <td className="num tm-mono">+{FULL_WINDOW.qqq}%</td>
                                    <td className="num tm-mono tm-neg">{FULL_WINDOW.mdd}%</td>
                                    <td className="num tm-mono muted">305</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="tm-caption">Same simulation, same tape — just sliced. <b>The recovery window
                    (+78%) and the correction window (−18%) are the same system in different weather.</b></p>
                </div>
            </section>

            {/* ── transcript (WCAG 1.2.1 + SEO; collapsed by default per redundancy research) ── */}
            <div className="tm-details" id="tm-transcript">
                <details id="tm-transcript-details">
                    <summary>Full narration transcript</summary>
                    {CHAPTERS.map(c => (
                        <div className="tm-t-ch" key={c.id}>
                            <h4>{c.kicker} — {c.title}</h4>
                            <p>{c.text}</p>
                        </div>
                    ))}
                </details>
            </div>

            {/* ── disclosures ── */}
            <div className="tm-disc">
                <b>Methodology.</b> Simulation June 2025 – August 14, 2026 on real OPRA NBBO quotes (Databento),
                mid-price fills on the actual listed contract at each decision bar, $0.65/contract commissions,
                real listed expirations. 303 of 305 fills priced from the tape; 2 fills used Black-Scholes
                fallback and are marked in the ledger. Live layer: IBKR paper account, decisions logged daily
                since August 1, 2026.<br /><br />
                <b>Simulated performance — as close to live as a backtest gets. Past performance — simulated or
                live — does not guarantee future results.</b> Options involve substantial risk and are not suitable
                for every investor; you can lose your entire investment. TradeMind never connects to or submits
                orders to your brokerage — signals only help you enter the order yourself. This page is educational
                material, not investment advice or a solicitation.
            </div>

            <audio ref={playerRef} preload="auto" muted={muted} />
        </div>
    );
}
