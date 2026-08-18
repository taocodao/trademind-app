'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { NAV, MAP_BEATS, type MapBeat } from './storyData';

/* ─────────────────────────────────────────────────────────────────────────────
   DecisionMap — Chapter 4: "The map"
   QQQ price vs strategy portfolio value, indexed to 100, with 8 annotated
   decision beats synced to the narration via word-level timestamps.

   Design rules applied from deep research:
     · indexed-to-100 (never dual-axis)                       — unambiguous
     · staged animation: lines draw, THEN beats reveal        — staged > continuous
     · temporal contiguity: beat emphasis synced to narration — d = 1.22 (9/9)
     · signaling: only the current beat is emphasized         — d = 0.41
     · unfavorable beats get equal-or-greater prominence      — cherry-picking mitigant
     · concise observational tooltips; the "why" stays in audio — annotation vs commentary
     · static fully-revealed end-state + replay control       — animation ↓accuracy caveat
     · prefers-reduced-motion renders the end-state directly
   ─────────────────────────────────────────────────────────────────────────── */

interface DecisionMapProps {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    active: boolean;           // this chapter's audio is the one playing
    forceDraw?: boolean;       // deck mode: draw when the slide is shown (no IntersectionObserver)
    onBeatView?: (label: string) => void;
    onBeatOpen?: (label: string) => void;
    /* i18n overrides — default to English MAP_BEATS */
    beats?: { label: string; tip: string }[];
    beatTimes?: number[];
    legendQ?: string; legendS?: string; idxNote?: string;
    replayLabel?: string; mapAria?: string; replayAria?: string;
}

export function DecisionMap({ audioRef, active, forceDraw, onBeatView, onBeatOpen,
    beats, beatTimes, legendQ, legendS, idxNote, replayLabel, mapAria, replayAria }: DecisionMapProps) {
    /* portrait geometry on phones so axis labels stay readable (a 900-wide
       viewBox squeezed into 350px renders 10.5px fonts at ~4px) */
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 720px)');
        const fn = () => setNarrow(mq.matches);
        fn();
        mq.addEventListener('change', fn);
        return () => mq.removeEventListener('change', fn);
    }, []);
    const W = narrow ? 480 : 900, H = narrow ? 540 : 380;
    const PL = narrow ? 36 : 46, PR = narrow ? 16 : 20, PT = narrow ? 26 : 30, PB = narrow ? 44 : 42;
    const axisFont = narrow ? 16 : 12.5;
    const endFont = narrow ? 17 : 13.5;
    const hitR = narrow ? 24 : 14;
    const dotR = (isCur: boolean, isUnfav: boolean) =>
        narrow ? (isCur ? 9 : isUnfav ? 8 : 6.5) : (isCur ? 6.5 : isUnfav ? 5.5 : 4.5);
    /* merge localized labels/tips/timing onto the base beat geometry */
    const BEATS: MapBeat[] = MAP_BEATS.map((b, i) => ({
        ...b,
        label: beats?.[i]?.label ?? b.label,
        tip: beats?.[i]?.tip ?? b.tip,
        t: beatTimes?.[i] ?? b.t,
    }));
    const [drawn, setDrawn] = useState(false);        // stage 1 complete
    const [revealed, setRevealed] = useState(0);      // beats revealed so far (stage 2)
    const [currentBeat, setCurrentBeat] = useState(-1);
    const [openTip, setOpenTip] = useState(-1);
    const [hovered, setHovered] = useState(-1);
    const revealedRef = useRef(0);
    const reducedMotion = useMemo(() =>
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

    const vals = NAV.map(d => d.nav);
    const spots = NAV.map(d => d.spot);
    const navIdx = vals.map(v => v / vals[0] * 100);
    const spotIdx = spots.map(v => v / spots[0] * 100);
    const all = [...navIdx, ...spotIdx];
    const min = Math.min(...all) * 0.97, max = Math.max(...all) * 1.03;
    const X = (i: number) => PL + i * (W - PL - PR) / (NAV.length - 1);
    const Y = (v: number) => H - PB - (v - min) / (max - min) * (H - PT - PB);

    const pathOf = (series: number[]) =>
        series.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    const navPath = useMemo(() => pathOf(navIdx), [narrow]);
    const spotPath = useMemo(() => pathOf(spotIdx), [narrow]);

    // month gridlines; label years only (5.6 years of months would crowd)
    const months: { i: number; label: string }[] = [];
    let lastM = '';
    NAV.forEach((d, i) => {
        const m = d.d.slice(0, 7);
        if (m !== lastM) { lastM = m; months.push({ i, label: m }); }
    });

    /* stage 1: line draw when scrolled into view (or instant if reduced motion) */
    const svgRef = useRef<SVGSVGElement | null>(null);
    useEffect(() => {
        if (reducedMotion) { setDrawn(true); setRevealed(BEATS.length); revealedRef.current = BEATS.length; return; }
        if (forceDraw !== undefined) {
            // deck mode: the parent tells us when the slide is visible
            if (forceDraw && !drawn) setDrawn(true);
            return;
        }
        const el = svgRef.current;
        if (!el || drawn) return;
        const io = new IntersectionObserver(es => {
            es.forEach(e => { if (e.isIntersecting) { setDrawn(true); io.disconnect(); } });
        }, { threshold: 0.35 });
        io.observe(el);
        return () => io.disconnect();
    }, [drawn, reducedMotion, forceDraw]);

    /* beat reveal: synced to narration when active, staggered otherwise */
    useEffect(() => {
        if (!drawn || reducedMotion) return;
        const el = audioRef.current;

        if (active && el) {
            const onTime = () => {
                const t = el.currentTime;
                let n = 0;
                BEATS.forEach((b, i) => { if (t >= b.t - 0.4) n = i + 1; });
                if (n !== revealedRef.current) {
                    for (let i = revealedRef.current; i < n; i++) onBeatView?.(BEATS[i].label);
                    revealedRef.current = n;
                    setRevealed(n);
                }
                let cur = -1;
                BEATS.forEach((b, i) => { if (t >= b.t - 0.4) cur = i; });
                setCurrentBeat(cur);
            };
            el.addEventListener('timeupdate', onTime);
            return () => el.removeEventListener('timeupdate', onTime);
        }

        // silent / not-playing path: gentle stagger after lines draw
        if (revealedRef.current < BEATS.length) {
            const timers: ReturnType<typeof setTimeout>[] = [];
            BEATS.forEach((_, i) => {
                timers.push(setTimeout(() => {
                    revealedRef.current = Math.max(revealedRef.current, i + 1);
                    setRevealed(revealedRef.current);
                    setCurrentBeat(-1);
                }, 1600 + i * 450));
            });
            return () => timers.forEach(clearTimeout);
        }
    }, [drawn, active, reducedMotion, audioRef, onBeatView]);

    const replay = () => {
        revealedRef.current = 0;
        setRevealed(0); setCurrentBeat(-1); setOpenTip(-1); setDrawn(false);
        requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    };

    const tipBeat = openTip >= 0 ? BEATS[openTip] : hovered >= 0 ? BEATS[hovered] : null;
    const tipIdx = openTip >= 0 ? openTip : hovered;

    return (
        <div className="tm-map">
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img"
                aria-label={mapAria ?? 'QQQ price versus strategy portfolio value, indexed to 100, January 2021 to August 2026, with eight annotated decision points'}>
                {/* gridlines */}
                {months.map((m, k) => (
                    <g key={k}>
                        <line x1={X(m.i)} y1={PT} x2={X(m.i)} y2={H - PB} stroke={m.label.endsWith('-01') ? '#3a3a52' : '#262638'} strokeWidth={1} />
                        {m.label.endsWith('-01') && <text x={X(m.i)} y={H - PB + (narrow ? 24 : 18)} fill="#8B95A9" fontSize={axisFont}
                            textAnchor="middle" fontFamily="Inter">{m.label.slice(0, 4)}</text>}
                    </g>
                ))}
                <line x1={PL} y1={Y(100)} x2={W - PR} y2={Y(100)} stroke="#3a3a52" strokeWidth={1} strokeDasharray="3 5" />
                <text x={PL - (narrow ? 6 : 8)} y={Y(100) + (narrow ? 6 : 4)} fill="#8B95A9" fontSize={axisFont} textAnchor="end" fontFamily="Inter">100</text>

                {/* zones (part of stage 1) */}
                {BEATS.filter(b => b.kind === 'zone').map((b, k) => (
                    <g key={k} style={{ opacity: drawn ? 1 : 0, transition: 'opacity .8s ease .4s' }}>
                        <rect x={X(b.i0)} y={PT} width={X(b.i1!) - X(b.i0)} height={H - PT - PB}
                            fill={b.tone === 'unfav' ? 'rgba(239,68,68,.07)' : 'rgba(148,163,184,.06)'} rx={4} />
                    </g>
                ))}

                {/* QQQ line */}
                <path d={spotPath} fill="none" stroke="#6b7280" strokeWidth={1.8}
                    className={`tm-map-line ${drawn ? 'drawn' : ''}`} style={{ transitionDelay: '0s' }} />
                {/* portfolio line */}
                <path d={navPath} fill="none" stroke="#e0a458" strokeWidth={2.4}
                    className={`tm-map-line ${drawn ? 'drawn' : ''}`} style={{ transitionDelay: '.5s' }} />

                {/* end labels */}
                <g style={{ opacity: revealed >= BEATS.length || reducedMotion ? 1 : 0, transition: 'opacity .6s ease' }}>
                    <circle cx={X(NAV.length - 1)} cy={Y(navIdx[navIdx.length - 1])} r={4} fill="#e0a458" />
                    <text x={X(NAV.length - 1)} y={Y(navIdx[navIdx.length - 1]) - (narrow ? 16 : 12)} fill="#e0a458"
                        fontSize={endFont} fontWeight={700} textAnchor="end" fontFamily="Inter">{navIdx[navIdx.length - 1].toFixed(0)}</text>
                    <text x={X(NAV.length - 1)} y={Y(spotIdx[spotIdx.length - 1]) + (narrow ? 26 : 20)} fill="#BCC6D8"
                        fontSize={endFont} fontWeight={600} textAnchor="end" fontFamily="Inter">{spotIdx[spotIdx.length - 1].toFixed(0)}</text>
                </g>

                {/* beat markers (stage 2) */}
                {BEATS.map((b, k) => {
                    if (k >= revealed) return null;
                    const isCur = k === currentBeat;
                    const isUnfav = b.tone === 'unfav';
                    const cxp = b.kind === 'zone' ? (X(b.i0) + X(b.i1!)) / 2 : X(b.i0);
                    const cyp = b.kind === 'zone' ? PT + 14 : Y(navIdx[b.i0]);
                    const color = isUnfav ? '#EF4444' : b.tone === 'fav' ? '#10B981' : '#94A3B8';
                    return (
                        <g key={k}
                            className={`tm-map-beat ${isCur ? 'cur' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => { setOpenTip(openTip === k ? -1 : k); onBeatOpen?.(b.label); }}
                            onMouseEnter={() => setHovered(k)}
                            onMouseLeave={() => setHovered(-1)}>
                            <circle cx={cxp} cy={cyp} r={hitR} fill="transparent" />
                            <circle cx={cxp} cy={cyp} r={dotR(isCur, isUnfav)}
                                fill={color} stroke="#0A0A0F" strokeWidth={2}
                                style={{ transition: 'all .3s ease', opacity: isCur ? 1 : 0.85 }} />
                            {isCur && <circle cx={cxp} cy={cyp} r={narrow ? 15 : 11} fill="none" stroke={color}
                                strokeWidth={1.5} className="tm-map-pulse" />}
                        </g>
                    );
                })}
            </svg>

            {/* current-beat label (signaling: only the narrated beat) */}
            <div className="tm-map-caption" aria-live="polite">
                {currentBeat >= 0 && currentBeat < revealed ? BEATS[currentBeat].label : '\u00A0'}
            </div>

            {/* tooltip card */}
            {tipBeat && tipIdx >= 0 && tipIdx < revealed && (
                <div className={`tm-map-tip ${tipBeat.tone === 'unfav' ? 'unfav' : ''}`}>
                    <div className="t">{tipBeat.label}</div>
                    <div className="d">{tipBeat.tip}</div>
                </div>
            )}

            {/* legend + replay */}
            <div className="tm-map-legend">
                <span><i style={{ background: '#6b7280' }} />{legendQ ?? 'QQQ price'}</span>
                <span><i style={{ background: '#e0a458' }} />{legendS ?? 'TradeMind portfolio'}</span>
                <span className="idx">{idxNote ?? 'both indexed to 100 · Jan 2021'}</span>
                <button className="tm-replay" onClick={replay} aria-label={replayAria ?? 'Replay the animation'}>{replayLabel ?? '↺ Replay'}</button>
            </div>

            {/* mobile: beats as a vertical timeline */}
            <div className="tm-map-timeline">
                {BEATS.map((b, k) => (
                    <div key={k} className={`tm-tl-item ${k < revealed ? 'on' : ''} ${b.tone}`}
                        onClick={() => { setOpenTip(openTip === k ? -1 : k); onBeatOpen?.(b.label); }}>
                        <div className="dot" />
                        <div>
                            <div className="l">{b.label}</div>
                            {openTip === k && <div className="d">{b.tip}</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
