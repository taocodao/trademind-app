'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { withCompensationDisclosure } from '@/lib/compliance';

/* ─────────────────────────────────────────────────────────────────────────────
   MillionaireCalc, "When could $10,000 make you a millionaire?"
   Ported 1:1 from the static landing page's age tool (public/landing/index.html):
   same math, same disclosures, plus the share bar.
   Rates are LABELED figures (2021 to 2026 model backtest, QQQ buy & hold
   long-run average, 3-month T-bill risk-free floor), never a promise.
   Keep every label intact.
   ───────────────────────────────────────────────────────────────────────────── */

/* Rate config: single source of truth for both tools below.
   RF_RATE is a live market rate shown with an as-of date. Refresh monthly
   from FRED DGS3MO (3-month Treasury, coupon-equivalent). Past 120 days the
   row stops showing a numeric rate rather than a stale figure with a
   confident date. */
const RF_RATE = 0.0387;           // FRED DGS3MO value for the as-of date below
const RF_ASOF = 'Aug 20, 2026';
const RF_ASOF_MS = Date.parse('2026-08-20T00:00:00Z');
const RF_STALE_MS = 120 * 24 * 3600 * 1000;
/* Non-breaking spaces around the middots keep each separator attached to
   its neighbors so narrow screens never strand a dangling dot. */
const RF_SUB = (RF_RATE * 100).toFixed(2) + '%/yr\u00A0·\u00A03-month U.S. Treasury bill\u00A0·\u00A0' + RF_ASOF;
const RF_SUB_STALE = '3-month U.S. Treasury bill\u00A0·\u00A0rate being refreshed';

const RATES = [
    { label: 'TradeMind backtest', sub: '36.3%/yr\u00A0·\u00A02021 to 2026\u00A0·\u00A0hypothetical', r: 0.363, color: '#e0a458', dash: '' },
    { label: 'QQQ buy & hold', sub: '13.5%/yr\u00A0·\u00A0long-run average', r: 0.135, color: '#5c8de0', dash: '' },
    { label: 'Risk-free rate', sub: Date.now() - RF_ASOF_MS > RF_STALE_MS ? RF_SUB_STALE : RF_SUB, r: RF_RATE, color: '#5c6577', dash: '6 5' },
];
const AMT = 10000;
const TARGET = 1000000;
const LIFE_CAP = 95; // ages past this render as an intentional non-numeric state, never a number

const fmt = (v: number) =>
    v >= 1e6 ? '$' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M'
    : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'k'
    : '$' + Math.round(v);
const fmtFull = (v: number) => '$' + Math.round(v).toLocaleString('en-US');

function project(r: number, bal: number, con: number, years: number): number[] {
    const out = [bal];
    for (let i = 0; i < years; i++) { bal = bal * (1 + r) + con; out.push(bal); }
    return out;
}
function ageAt(series: number[], target: number, startAge: number): number | null {
    for (let i = 0; i < series.length; i++) if (series[i] >= target) return startAge + i;
    return null;
}

const SHARE_TEXT = 'When could $10,000 make you a millionaire? I ran the numbers, every assumption labeled →';
// Referral variant: the same hook plus the two-sided time offer. Disclosure
// lands inside the sentence via withCompensationDisclosure at share time.
const REFERRAL_SHARE_TEXT = 'When could $10,000 make you a millionaire? I ran the numbers on TradeMind. Join with my link and you get about two extra months on your plan.';

export function MillionaireCalc() {
    const [age, setAge] = useState(35);
    const [copied, setCopied] = useState(false);
    const [advAge, setAdvAge] = useState(35);
    const [advBal, setAdvBal] = useState(30000);
    const [advCon, setAdvCon] = useState(6000);
    const [logScale, setLogScale] = useState(true);

    /* ── simple tool ── */
    const simple = useMemo(() => RATES.map(s => {
        const t = Math.log(TARGET / AMT) / Math.log(1 + s.r);
        const cross = age + t;
        const reachable = cross <= LIFE_CAP;
        return {
            ...s,
            reachable,
            big: reachable ? 'Age ' + Math.ceil(cross) : 'Not within a lifetime',
            small: reachable
                ? t.toFixed(1) + ' years from now · the year ' + (new Date().getFullYear() + Math.ceil(t))
                : Math.round(t) + ' years at this rate',
        };
    }), [age]);
    const gapYears = Math.ceil(
        Math.log(TARGET / AMT) / Math.log(1.135) - Math.log(TARGET / AMT) / Math.log(1.363)
    );

    /* ── advanced tool ── */
    const adv = useMemo(() => {
        const endAge = Math.min(advAge + 20, 70);
        const years = endAge - advAge;
        const data = RATES.map(s => ({ ...s, series: project(s.r, advBal, advCon, years) }));
        return { endAge, years, data };
    }, [advAge, advBal, advCon]);

    const chart = useMemo(() => {
        const { endAge, years, data } = adv;
        const W = 720, H = 340, PL = 64, PR = 16, PT = 26, PB = 34;
        let maxV = Math.max(...data.flatMap(d => d.series));
        if (maxV < 1) maxV = 1;
        const minV = Math.max(1000, Math.min(advBal, ...data.flatMap(d => d.series)) * 0.9);
        const x = (i: number) => PL + i * (W - PL - PR) / years;
        let y: (v: number) => number;
        const ticks: number[] = [];
        if (logScale) {
            const lo = Math.log10(Math.max(1000, minV));
            let hi = Math.log10(maxV * 1.05);
            if (hi <= lo) hi = lo + 1;
            y = v => H - PB - (Math.log10(Math.max(v, 1)) - lo) / (hi - lo) * (H - PT - PB);
            for (let p = Math.ceil(lo); p <= Math.floor(hi); p++) ticks.push(Math.pow(10, p));
        } else {
            y = v => H - PB - (v / (maxV * 1.05)) * (H - PT - PB);
            const raw = maxV / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
            const nice = [1, 2, 2.5, 5, 10].find(m => m * mag >= raw) || 10;
            for (let v = 0; v <= maxV * 1.05; v += nice * mag) ticks.push(v);
        }
        const ageTicks: number[] = [];
        for (let a = Math.ceil(advAge / 5) * 5; a <= endAge; a += 5) ageTicks.push(a);
        return { W, H, PL, PR, PT, PB, x, y, ticks, ageTicks, years };
    }, [adv, advBal, logScale, advAge]);

    const shareUrl = typeof window !== 'undefined'
        ? encodeURIComponent(window.location.href.split('#')[0])
        : '';
    const shareText = encodeURIComponent(SHARE_TEXT);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(SHARE_TEXT + ' ' + decodeURIComponent(shareUrl));
            setCopied(true);
        } catch { /* clipboard blocked, user copies manually */ }
        setTimeout(() => setCopied(false), 1800);
    };

    // Opt-in referral share (Q1 decision: never silent). Only offered to
    // logged-in members whose referral code resolves; the neutral row above
    // stays referral-free for everyone.
    const { authenticated } = usePrivy();
    const [refLink, setRefLink] = useState<string | null>(null);
    const [refCopied, setRefCopied] = useState(false);

    useEffect(() => {
        if (!authenticated) return;
        fetch('/api/referrals')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d?.shareLink) setRefLink(d.shareLink); })
            .catch(() => {});
    }, [authenticated]);

    const referralText = withCompensationDisclosure(REFERRAL_SHARE_TEXT);

    const copyReferralLink = async () => {
        if (!refLink) return;
        try {
            await navigator.clipboard.writeText(referralText + ' ' + refLink);
            setRefCopied(true);
        } catch { /* clipboard blocked, user copies manually */ }
        setTimeout(() => setRefCopied(false), 1800);
    };

    return (
        <section className="tm-calc" id="calc">
            <div className="tm-calc-inner">
                <div className="tm-kicker">Run your own numbers</div>
                <h2 className="tm-calc-title">What does patience actually buy you?</h2>
                <p className="tm-calc-sub">One question, one answer. Type your age and compare three labeled rates: the backtest, the index, and the risk-free floor.</p>

                <div className="tm-ageinput">
                    <label htmlFor="tm-mAge">Your age</label>
                    <div className="tm-agebox">
                        <button className="step" aria-label="Decrease age" onClick={() => setAge(a => Math.max(18, a - 1))}>−</button>
                        <input
                            type="number" id="tm-mAge" min={18} max={70} value={age} inputMode="numeric"
                            onChange={e => {
                                const v = parseInt(e.target.value, 10);
                                setAge(isNaN(v) ? 35 : Math.max(18, Math.min(70, v)));
                            }}
                        />
                        <button className="step" aria-label="Increase age" onClick={() => setAge(a => Math.min(70, a + 1))}>+</button>
                    </div>
                    <div className="tm-ctxline">$10,000 starting balance · target $1,000,000 · three labeled rates: a backtest, the index, and the risk-free floor</div>
                </div>

                <div className="tm-ageresults">
                    {simple.map(s => (
                        <div className={'tm-arow' + (s.reachable ? '' : ' tm-arow-unreach')} key={s.label}>
                            <div className="aWho">
                                <span className="dot" style={{ background: s.color }} />
                                <div>
                                    <div className="aLabel">{s.label}</div>
                                    <div className="aSub">{s.sub}</div>
                                </div>
                            </div>
                            <div className="aRes">
                                <div className={'aAge' + (s.reachable ? '' : ' aNever')} style={s.reachable ? { color: s.color } : undefined}>{s.big}</div>
                                <div className="aWhen">{s.small}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="tm-gapline">
                    At these labeled rates, the backtest pace reaches $1M about <b>{gapYears} years sooner</b> than buy-and-hold, whatever age you start.
                </div>
                <div className="tm-stressnote">
                    The risk-free row is the point. Money that takes no market risk does not get there at all on this balance. Every year of the {gapYears}-year gap above is paid for with drawdown risk: the -17.8% the backtest window took, and the -30.4% the 15-month real-quote window took. That trade is the whole decision.
                </div>
                <div className="tm-ctxline" style={{ marginTop: 14, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                    Two measurements, both labeled: <b>36.3%</b> is the annualized rate of the 2021 to 2026 model-priced backtest used in this tool, the same record in the table above. A separate 15-month window, verified on real exchange quotes, took a deeper 30.4% drawdown. Neither is a forecast. <a href="#story" style={{ color: '#e0a458' }}>Read the chapters →</a>
                </div>

                <div className="tm-sharebar">
                    <span className="tm-sharelabel">Share the question</span>
                    <a className="tm-shbtn" target="_blank" rel="noopener"
                        href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}>
                        <svg viewBox="0 0 24 24"><path d="M18.9 2H22l-6.8 7.8L23.3 22h-6.3l-4.9-6.4L6.5 22H3.4l7.3-8.3L1 2h6.5l4.4 5.9L18.9 2zm-1.1 18.1h1.7L7.6 3.8H5.7l12.1 16.3z" /></svg>Post
                    </a>
                    <a className="tm-shbtn" target="_blank" rel="noopener"
                        href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}>
                        <svg viewBox="0 0 24 24"><path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V22h3.4z" /></svg>Share
                    </a>
                    <a className="tm-shbtn" target="_blank" rel="noopener"
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}>
                        <svg viewBox="0 0 24 24"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.2 8.2h4.6V23H.2V8.2zM8.2 8.2h4.4v2h.1c.6-1.2 2.1-2.4 4.4-2.4 4.7 0 5.6 3.1 5.6 7.1V23h-4.6v-7.1c0-1.7 0-3.9-2.4-3.9s-2.7 1.8-2.7 3.7V23H8.2V8.2z" /></svg>Post
                    </a>
                    <button className="tm-shbtn" onClick={copyLink}>
                        <svg viewBox="0 0 24 24"><path d="M10.6 13.4a1 1 0 0 0 1.4 1.4l4-4a3 3 0 0 0-4.2-4.2l-2.3 2.3a1 1 0 0 0 1.4 1.4l2.3-2.3a1 1 0 0 1 1.4 1.4l-4 4zm2.8-2.8a1 1 0 0 0-1.4-1.4l-4 4a3 3 0 0 0 4.2 4.2l2.3-2.3a1 1 0 0 0-1.4-1.4l-2.3 2.3a1 1 0 0 0-1.4 1.4l4-4z" /></svg>
                        <span>{copied ? 'Copied' : 'Copy link'}</span>
                    </button>
                </div>

                {refLink && (
                    <div className="tm-sharebar" style={{ marginTop: 10, opacity: 0.95 }}>
                        <span className="tm-sharelabel">Share as a member, earn time</span>
                        <a className="tm-shbtn" target="_blank" rel="noopener"
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(referralText)}&url=${encodeURIComponent(refLink)}`}>
                            <svg viewBox="0 0 24 24"><path d="M18.9 2H22l-6.8 7.8L23.3 22h-6.3l-4.9-6.4L6.5 22H3.4l7.3-8.3L1 2h6.5l4.4 5.9L18.9 2zm-1.1 18.1h1.7L7.6 3.8H5.7l12.1 16.3z" /></svg>Post
                        </a>
                        <a className="tm-shbtn" target="_blank" rel="noopener"
                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(refLink)}`}>
                            <svg viewBox="0 0 24 24"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.2 8.2h4.6V23H.2V8.2zM8.2 8.2h4.4v2h.1c.6-1.2 2.1-2.4 4.4-2.4 4.7 0 5.6 3.1 5.6 7.1V23h-4.6v-7.1c0-1.7 0-3.9-2.4-3.9s-2.7 1.8-2.7 3.7V23H8.2V8.2z" /></svg>Post
                        </a>
                        <button className="tm-shbtn" onClick={copyReferralLink}>
                            <svg viewBox="0 0 24 24"><path d="M10.6 13.4a1 1 0 0 0 1.4 1.4l4-4a3 3 0 0 0-4.2-4.2l-2.3 2.3a1 1 0 0 0 1.4 1.4l2.3-2.3a1 1 0 0 1 1.4 1.4l-4 4zm2.8-2.8a1 1 0 0 0-1.4-1.4l-4 4a3 3 0 0 0 4.2 4.2l2.3-2.3a1 1 0 0 0-1.4-1.4l-2.3 2.3a1 1 0 0 0-1.4 1.4l4-4z" /></svg>
                            <span>{refCopied ? 'Copied' : 'Copy referral link'}</span>
                        </button>
                        <span className="tm-sharelabel" style={{ textTransform: 'none', letterSpacing: 0, opacity: 0.7 }}>You both get bonus subscription time. Disclosure is included in the text.</span>
                    </div>
                )}

                <div className="tm-calcdisc">
                    <b>Your situation will differ.</b> This tool illustrates one hypothetical profile. Yours, income, tax status, risk tolerance, time horizon, is different, and the results shown may not be relevant to it.<br /><br />
                    <b>Assumptions.</b> A $10,000 <b>starting balance</b> (an existing balance, not a one-year IRA contribution, which is capped at $7,000 in 2026). Constant annual returns: <b>36.3%</b> = the TradeMind strategy <b>backtest</b>, 2021 to 2026 continuous model-priced series, hypothetical; <b>13.5%</b> = QQQ buy-and-hold, long-run average annual rate; <b>{(RF_RATE * 100).toFixed(2)}%</b> = the risk-free rate, the 3-month U.S. Treasury bill coupon-equivalent yield as of {RF_ASOF}, shown as the no-market-risk floor. The risk-free rate is a real, externally verifiable market rate and changes over time; the other two are historical figures for fixed past windows and are not forecasts. No additions, taxes, or fees. Real returns vary year to year, the <b>order</b> of gains and losses changes outcomes, sometimes dramatically.<br /><br />
                    <b>Risks &amp; limitations.</b> These are hypothetical, backtested figures. They were not achieved by any actual account, do not represent live trading, and do not guarantee future results. Options involve substantial risk, including loss of the entire investment.
                </div>

                <details className="tm-advanced">
                    <summary>Advanced: your balance, contributions, and the full growth curve</summary>
                    <div className="tm-calcgrid">
                        <div className="tm-calcpanel">
                            <div className="tm-cfield">
                                <label>Your age <output>{advAge}</output></label>
                                <input type="range" min={18} max={65} step={1} value={advAge} onChange={e => setAdvAge(+e.target.value)} />
                            </div>
                            <div className="tm-cfield">
                                <label>Current balance <output>{fmtFull(advBal)}</output></label>
                                <input type="range" min={0} max={250000} step={1000} value={advBal} onChange={e => setAdvBal(+e.target.value)} />
                            </div>
                            <div className="tm-cfield">
                                <label>Annual contribution <output>{fmtFull(advCon)}</output></label>
                                <input type="range" min={0} max={10000} step={500} value={advCon} onChange={e => setAdvCon(+e.target.value)} />
                            </div>
                            <div className="tm-scaletoggle" role="group" aria-label="Chart scale">
                                <button className={logScale ? '' : 'on'} onClick={() => setLogScale(false)}>Linear</button>
                                <button className={logScale ? 'on' : ''} onClick={() => setLogScale(true)}>Log</button>
                            </div>
                        </div>
                        <div>
                            <div className="tm-calcchart">
                                <svg viewBox={`0 0 ${chart.W} ${chart.H}`} role="img" aria-label="Hypothetical compounding projection">
                                    {chart.ticks.map(t => (
                                        <g key={t}>
                                            <line x1={chart.PL} y1={chart.y(t)} x2={chart.W - chart.PR} y2={chart.y(t)} stroke="#232333" strokeWidth={1} />
                                            <text x={chart.PL - 8} y={chart.y(t) + 4} fill="#8B95A9" fontSize={10.5} textAnchor="end" fontFamily="JetBrains Mono, monospace">{fmt(t)}</text>
                                        </g>
                                    ))}
                                    {chart.ageTicks.map(a => (
                                        <text key={a} x={chart.x(a - advAge)} y={chart.H - chart.PB + 18} fill="#8B95A9" fontSize={10.5} textAnchor="middle" fontFamily="Inter, sans-serif">age {a}</text>
                                    ))}
                                    {adv.data.map(d => (
                                        <g key={d.label}>
                                            <path
                                                d={d.series.map((v, i) => (i ? 'L' : 'M') + chart.x(i).toFixed(1) + ' ' + chart.y(v).toFixed(1)).join(' ')}
                                                fill="none" stroke={d.color} strokeWidth={2.2}
                                                strokeDasharray={d.dash || undefined}
                                            />
                                            <circle cx={chart.x(adv.years)} cy={chart.y(d.series[adv.years])} r={3.5} fill={d.color} />
                                        </g>
                                    ))}
                                </svg>
                            </div>
                            <div className="tm-miles">
                                {adv.data.map(d => {
                                    const mAge = ageAt(d.series, 1e6, advAge);
                                    const finalV = d.series[adv.years];
                                    const today = finalV / Math.pow(1.025, adv.years);
                                    return (
                                        <div className="tm-mile" key={d.label}>
                                            <div className="who"><span className="dot" style={{ background: d.color }} />{d.label}</div>
                                            <div className="age" style={{ color: d.color }}>{mAge ? '$1M by age ' + mAge : 'Not on this path'}</div>
                                            <div className="sub2">{d.sub}<br />{fmt(finalV)} by age {adv.endAge} · ≈{fmt(today)} in today's dollars</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="tm-calcdisc">
                        <b>Assumptions.</b> Constant annual returns: 36.3% = the strategy's 2021 to 2026 continuous model-priced <b>backtest</b>, hypothetical, the same record narrated in the chapters; 13.5% = QQQ buy-and-hold, long-run average; {(RF_RATE * 100).toFixed(2)}% = the risk-free rate, the 3-month U.S. Treasury bill coupon-equivalent yield as of {RF_ASOF}. Annual compounding, contributions at year-end, no taxes or fees; “today’s dollars” deflates at 2.5%/yr. Projections stop after 20 years, extrapolating any backtest further is storytelling, not math. Hypothetical, backtested figures, not achieved by any actual account, and no guarantee of future results.
                    </div>
                </details>
            </div>
        </section>
    );
}
