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
    onBeatView?: (label: string) => void;
    onBeatOpen?: (label: string) => void;
}

const W = 900, H = 380, PL = 46, PR = 20, PT = 30, PB = 42;

export function DecisionMap({ audioRef, active, onBeatView, onBeatOpen }: DecisionMapProps) {
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
    const navPath = useMemo(() => pathOf(navIdx), []);
    const spotPath = useMemo(() => pathOf(spotIdx), []);

    // month gridlines
    const months: { i: number; label: string }[] = [];
    let lastM = '';
    NAV.forEach((d, i) => {
        const m = d.d.slice(0, 7);
        if (m !== lastM) { lastM = m; months.push({ i, label: m }); }
    });

    /* stage 1: line draw when scrolled into view (or instant if reduced motion) */
    const svgRef = useRef<SVGSVGElement | null>(null);
    useEffect(() => {
        if (reducedMotion) { setDrawn(true); setRevealed(MAP_BEATS.length); revealedRef.current = MAP_BEATS.length; return; }
        const el = svgRef.current;
        if (!el || drawn) return;
        const io = new IntersectionObserver(es => {
            es.forEach(e => { if (e.isIntersecting) { setDrawn(true); io.disconnect(); } });
        }, { threshold: 0.35 });
        io.observe(el);
        return () => io.disconnect();
    }, [drawn, reducedMotion]);

    /* beat reveal: synced to narration when active, staggered otherwise */
    useEffect(() => {
        if (!drawn || reducedMotion) return;
        const el = audioRef.current;

        if (active && el) {
            const onTime = () => {
                const t = el.currentTime;
                let n = 0;
                MAP_BEATS.forEach((b, i) => { if (t >= b.t - 0.4) n = i + 1; });
                if (n !== revealedRef.current) {
                    for (let i = revealedRef.current; i < n; i++) onBeatView?.(MAP_BEATS[i].label);
                    revealedRef.current = n;
                    setRevealed(n);
                }
                let cur = -1;
                MAP_BEATS.forEach((b, i) => { if (t >= b.t - 0.4) cur = i; });
                setCurrentBeat(cur);
            };
            el.addEventListener('timeupdate', onTime);
            return () => el.removeEventListener('timeupdate', onTime);
        }

        // silent / not-playing path: gentle stagger after lines draw
        if (revealedRef.current < MAP_BEATS.length) {
            const timers: ReturnType<typeof setTimeout>[] = [];
            MAP_BEATS.forEach((_, i) => {
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

    const tipBeat = openTip >= 0 ? MAP_BEATS[openTip] : hovered >= 0 ? MAP_BEATS[hovered] : null;
    const tipIdx = openTip >= 0 ? openTip : hovered;

    return (
        <div className="tm-map">
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img"
                aria-label="QQQ price versus strategy portfolio value, indexed to 100, June 2025 to August 2026, with eight annotated decision points">
                {/* gridlines */}
                {months.map((m, k) => (
                    <g key={k}>
                        <line x1={X(m.i)} y1={PT} x2={X(m.i)} y2={H - PB} stroke="#1c1c2b" strokeWidth={1} />
                        {k % 2 === 0 && <text x={X(m.i)} y={H - PB + 18} fill="#5c6577" fontSize={10.5}
                            textAnchor="middle" fontFamily="Inter">{m.label.slice(2).replace('-', '/')}</text>}
                    </g>
                ))}
                <line x1={PL} y1={Y(100)} x2={W - PR} y2={Y(100)} stroke="#2a2a3d" strokeWidth={1} strokeDasharray="3 5" />
                <text x={PL - 8} y={Y(100) + 4} fill="#5c6577" fontSize={10.5} textAnchor="end" fontFamily="Inter">100</text>

                {/* zones (part of stage 1) */}
                {MAP_BEATS.filter(b => b.kind === 'zone').map((b, k) => (
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
                <g style={{ opacity: revealed >= MAP_BEATS.length || reducedMotion ? 1 : 0, transition: 'opacity .6s ease' }}>
                    <circle cx={X(NAV.length - 1)} cy={Y(navIdx[navIdx.length - 1])} r={4} fill="#e0a458" />
                    <text x={X(NAV.length - 1)} y={Y(navIdx[navIdx.length - 1]) - 12} fill="#e0a458"
                        fontSize={12} fontWeight={600} textAnchor="end" fontFamily="Inter">166.9</text>
                    <text x={X(NAV.length - 1)} y={Y(spotIdx[spotIdx.length - 1]) + 20} fill="#9aa3b5"
                        fontSize={12} textAnchor="end" fontFamily="Inter">139.7</text>
                </g>

                {/* beat markers (stage 2) */}
                {MAP_BEATS.map((b, k) => {
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
                            <circle cx={cxp} cy={cyp} r={14} fill="transparent" />
                            <circle cx={cxp} cy={cyp} r={isCur ? 6.5 : isUnfav ? 5.5 : 4.5}
                                fill={color} stroke="#0A0A0F" strokeWidth={2}
                                style={{ transition: 'all .3s ease', opacity: isCur ? 1 : 0.85 }} />
                            {isCur && <circle cx={cxp} cy={cyp} r={11} fill="none" stroke={color}
                                strokeWidth={1.5} className="tm-map-pulse" />}
                        </g>
                    );
                })}
            </svg>

            {/* current-beat label (signaling: only the narrated beat) */}
            <div className="tm-map-caption" aria-live="polite">
                {currentBeat >= 0 && currentBeat < revealed ? MAP_BEATS[currentBeat].label : '\u00A0'}
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
                <span><i style={{ background: '#6b7280' }} />QQQ price</span>
                <span><i style={{ background: '#e0a458' }} />TradeMind portfolio</span>
                <span className="idx">both indexed to 100 · Jun 2025</span>
                <button className="tm-replay" onClick={replay} aria-label="Replay the animation">↺ Replay</button>
            </div>

            {/* mobile: beats as a vertical timeline */}
            <div className="tm-map-timeline">
                {MAP_BEATS.map((b, k) => (
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
