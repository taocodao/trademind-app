'use client';

/* PatienceSection — "Patience Is the Strategy". A large annotated timeline
   of the eleven real LEAPS entries across the 5.6-year record. Dates and
   metadata are drawn straight from the ledger in story/storyData.ts, so the
   timeline can never drift from the deck below.

   Design intent: the vertical axis is a real, labeled quantity (approximate
   holding length in months, capped at the record end). Waiting stretches are
   shaded so the section's thesis — most of the return happens while nothing
   happens — reads visually. On hover or focus, each entry reveals its fill
   price and contract. All copy is dash-clean; see the build guard. */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SECTIONS_I18N, SectionLang } from './sectionsI18n';

/* LEAPS BUY TO OPEN entries — dates, contracts, mid fills straight from the
   ledger. Exit dates are the paired SELL TO CLOSE in the same ledger; where
   the position is still open at record end, we cap holding to the record end. */
interface Entry {
    d: string;         // entry date YYYY-MM-DD
    exit: string;      // exit date or record end
    contract: string;  // e.g. "QQQ $239C · Aug 2022 (model)"
    px: number;        // mid fill in USD (per share)
}

const RECORD_END = '2026-08-14';

/* Holding length in months = (exit - entry) / 30.44. When the pair is still
   open at record end (top 2026 entry), we use the record end as the anchor. */
const ENTRIES: Entry[] = [
    { d: '2021-02-25', exit: '2021-05-11', contract: 'QQQ $239C, Aug 2022', px: 91.87 },
    { d: '2021-03-03', exit: '2021-05-11', contract: 'QQQ $240C, Aug 2022', px: 85.75 },
    { d: '2021-05-11', exit: '2022-01-14', contract: 'QQQ $251C, May 2022', px: 83.19 },
    { d: '2023-04-25', exit: '2023-08-08', contract: 'QQQ $259C, Apr 2024', px: 70.32 },
    { d: '2023-08-08', exit: '2024-05-24', contract: 'QQQ $318C, Aug 2024', px: 78.06 },
    { d: '2023-08-18', exit: '2024-05-24', contract: 'QQQ $301C, Aug 2024', px: 80.12 },
    { d: '2024-07-24', exit: '2025-04-04', contract: 'QQQ $391C, Jul 2025', px: 101.86 },
    { d: '2025-09-02', exit: '2025-11-14', contract: 'QQQ $471C, Sep 2026', px: 125.77 },
    { d: '2025-11-17', exit: '2026-05-15', contract: 'QQQ $502C, May 2027', px: 158.80 },
    { d: '2025-11-18', exit: '2026-05-15', contract: 'QQQ $487C, May 2027', px: 168.59 },
    { d: '2026-07-28', exit: RECORD_END,   contract: 'QQQ $581C, Jan 2028', px: 151.78 },
];

const SPAN_START = '2021-01-04';   /* simulation start (methodology) */
const SPAN_END = RECORD_END;       /* record end (methodology) */

const monthsBetween = (a: string, b: string) => {
    const ms = new Date(b).getTime() - new Date(a).getTime();
    return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.44));
};

export function PatienceSection() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: SectionLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = SECTIONS_I18N[lang].patience;

    /* SVG layout. Height is the main change: the axis now has room. */
    const W = 1100, H = 420;
    const PL = 76;                 /* left padding — room for y-axis labels */
    const PR = 28;                 /* right padding */
    const PT = 56;                 /* top padding — room for date labels */
    const PB = 84;                 /* bottom padding — x-axis + title */
    const plotW = W - PL - PR;
    const plotH = H - PT - PB;

    const t0 = new Date(SPAN_START).getTime();
    const t1 = new Date(SPAN_END).getTime();
    const xAt = (d: string) => PL + ((new Date(d).getTime() - t0) / (t1 - t0)) * plotW;

    /* Y-axis: holding length in months, 0 to 30, gridlines every 6. */
    const yMax = 30;
    const yAt = (months: number) => PT + plotH - (Math.min(months, yMax) / yMax) * plotH;

    const enriched = useMemo(
        () => ENTRIES.map(e => ({ ...e, hold: monthsBetween(e.d, e.exit) })),
        [],
    );

    /* Waiting stretches: [SPAN_START..first entry] and every gap between one
       entry's exit and the next entry's date. Later dedupe overlaps because
       positions overlap (e.g. two entries in the same month). */
    const waits = useMemo(() => {
        const sorted = [...enriched].sort((a, b) => a.d.localeCompare(b.d));
        const segs: { start: string; end: string; months: number }[] = [];
        let cursor = SPAN_START;
        for (const e of sorted) {
            if (e.d > cursor) {
                segs.push({ start: cursor, end: e.d, months: monthsBetween(cursor, e.d) });
            }
            if (e.exit > cursor) cursor = e.exit;
        }
        if (cursor < SPAN_END) {
            segs.push({ start: cursor, end: SPAN_END, months: monthsBetween(cursor, SPAN_END) });
        }
        return segs;
    }, [enriched]);

    /* Longest wait, to annotate. */
    const longest = useMemo(
        () => waits.reduce((best, s) => (s.months > best.months ? s : best), waits[0] ?? { start: '', end: '', months: 0 }),
        [waits],
    );
    const longestMonths = Math.round(longest.months);

    /* January gridlines. */
    const years = [2021, 2022, 2023, 2024, 2025, 2026];
    /* Quarterly minor ticks (skip Jan of each year to avoid overlap). */
    const quarters = years.flatMap(y => ['04', '07', '10'].map(m => `${y}-${m}-01`));

    /* Hover / focus state. */
    const [hover, setHover] = useState<number | null>(null);

    /* Y-axis label font, x-axis year label font. */
    const yFont = 12;
    const xFont = 13;

    /* Format a YYYY-MM-DD to "Feb 2021" style label; localized by lang. */
    const shortDate = (d: string) => {
        const dt = new Date(d);
        try {
            const locale = lang === 'zh' ? 'zh-CN' : lang === 'es' ? 'es-ES' : 'en-US';
            return dt.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
        } catch {
            return d;
        }
    };

    return (
        <section className="tm-story tm-patience">
            <div className="tm-sec-inner">
                <div className="tm-kicker">{c.kicker}</div>
                <h2 className="tm-sec-title">{c.title}</h2>
                <p className="tm-sec-p">{c.p1}</p>
                <p className="tm-sec-p">{c.p2}</p>

                <div className="tm-patience-chartwrap">
                    <svg
                        className="tm-patience-timeline"
                        viewBox={`0 0 ${W} ${H}`}
                        role="img"
                        aria-label={c.cap}
                    >
                        {/* ─── Waiting stretches: low-opacity band across the plot ─── */}
                        {waits.map((w, i) => {
                            const x1 = xAt(w.start), x2 = xAt(w.end);
                            return (
                                <rect
                                    key={i}
                                    x={x1}
                                    y={PT}
                                    width={Math.max(0, x2 - x1)}
                                    height={plotH}
                                    fill="var(--s-violet)"
                                    fillOpacity={0.06}
                                >
                                    <title>
                                        {c.legendWait}: {shortDate(w.start)} → {shortDate(w.end)} ({Math.round(w.months)} mo)
                                    </title>
                                </rect>
                            );
                        })}

                        {/* ─── Y-axis: gridlines and labels ─── */}
                        {[0, 6, 12, 18, 24, 30].map(m => (
                            <g key={m}>
                                <line
                                    x1={PL} y1={yAt(m)} x2={W - PR} y2={yAt(m)}
                                    stroke="var(--s-line)" strokeWidth={1}
                                    strokeDasharray={m === 0 ? '' : '2 4'}
                                />
                                <text
                                    x={PL - 10} y={yAt(m) + 4}
                                    textAnchor="end"
                                    fill="var(--s-ink3)" fontSize={yFont}
                                    fontFamily="Inter, sans-serif"
                                >
                                    {m}
                                </text>
                            </g>
                        ))}
                        {/* Y-axis title */}
                        <text
                            x={-(PT + plotH / 2)} y={22}
                            transform="rotate(-90)"
                            textAnchor="middle"
                            fill="var(--s-ink2)" fontSize={12} letterSpacing=".08em"
                            fontFamily="Inter, sans-serif"
                        >
                            {c.yAxis.toUpperCase()}
                        </text>

                        {/* ─── X-axis: quarterly minor ticks (no labels) ─── */}
                        {quarters.map(q => (
                            <line
                                key={q}
                                x1={xAt(q)} y1={PT + plotH - 4}
                                x2={xAt(q)} y2={PT + plotH + 4}
                                stroke="var(--s-line)" strokeWidth={1}
                            />
                        ))}
                        {/* Year major ticks and labels */}
                        {years.map(y => (
                            <g key={y}>
                                <line
                                    x1={xAt(`${y}-01-01`)} y1={PT}
                                    x2={xAt(`${y}-01-01`)} y2={PT + plotH + 8}
                                    stroke="var(--s-line)" strokeWidth={1.2}
                                />
                                <text
                                    x={xAt(`${y}-01-01`)} y={PT + plotH + 26}
                                    textAnchor="middle"
                                    fill="var(--s-ink2)" fontSize={xFont} fontWeight={600}
                                    fontFamily="Inter, sans-serif"
                                >
                                    {y}
                                </text>
                            </g>
                        ))}
                        {/* X-axis title */}
                        <text
                            x={PL + plotW / 2} y={H - 20}
                            textAnchor="middle"
                            fill="var(--s-ink3)" fontSize={11.5} letterSpacing=".14em"
                            fontFamily="Inter, sans-serif"
                        >
                            {c.xAxis.toUpperCase()}
                        </text>

                        {/* ─── Longest-stretch annotation ─── */}
                        {longest.start && longest.end && (() => {
                            const midX = (xAt(longest.start) + xAt(longest.end)) / 2;
                            const y = yAt(28);
                            const labelX = midX;
                            const labelY = PT + 18;
                            return (
                                <g>
                                    {/* bracket-like tick above the widest gap */}
                                    <line
                                        x1={xAt(longest.start)} y1={y}
                                        x2={xAt(longest.end)} y2={y}
                                        stroke="var(--s-violet)" strokeOpacity={0.55}
                                        strokeWidth={1.4}
                                    />
                                    <line x1={xAt(longest.start)} y1={y} x2={xAt(longest.start)} y2={y + 6}
                                        stroke="var(--s-violet)" strokeOpacity={0.55} strokeWidth={1.4} />
                                    <line x1={xAt(longest.end)} y1={y} x2={xAt(longest.end)} y2={y + 6}
                                        stroke="var(--s-violet)" strokeOpacity={0.55} strokeWidth={1.4} />
                                    <line x1={midX} y1={y} x2={labelX} y2={labelY + 6}
                                        stroke="var(--s-violet)" strokeOpacity={0.35} strokeWidth={1} />
                                    <text
                                        x={labelX} y={labelY}
                                        textAnchor="middle"
                                        fill="var(--s-ink)" fontSize={12.5} fontWeight={600}
                                        fontFamily="Inter, sans-serif"
                                    >
                                        {`${c.longest.replace('22', String(longestMonths))}`}
                                    </text>
                                </g>
                            );
                        })()}

                        {/* ─── Entry markers ─── */}
                        {enriched.map((e, i) => {
                            const cx = xAt(e.d);
                            const cy = yAt(e.hold);
                            const isHover = hover === i;
                            return (
                                <g
                                    key={e.d + '-' + i}
                                    onMouseEnter={() => setHover(i)}
                                    onMouseLeave={() => setHover(h => (h === i ? null : h))}
                                    onFocus={() => setHover(i)}
                                    onBlur={() => setHover(h => (h === i ? null : h))}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`Entry ${e.d}, fill ${e.px.toFixed(2)}, ${e.contract}`}
                                    style={{ outline: 'none', cursor: 'pointer' }}
                                >
                                    {/* stem: from baseline (y=0) to marker (hold length) */}
                                    <line
                                        x1={cx} y1={yAt(0)}
                                        x2={cx} y2={cy}
                                        stroke="var(--s-amber)"
                                        strokeOpacity={isHover ? 1 : 0.85}
                                        strokeWidth={isHover ? 2.4 : 1.8}
                                    />
                                    <circle
                                        cx={cx} cy={cy}
                                        r={isHover ? 7 : 5.5}
                                        fill="var(--s-amber)"
                                    />
                                    {/* vertical date label above the marker (desktop only) */}
                                    <text
                                        x={cx} y={cy - 10}
                                        textAnchor="start"
                                        transform={`rotate(-58, ${cx}, ${cy - 10})`}
                                        fill={isHover ? 'var(--s-ink)' : 'var(--s-ink2)'}
                                        fontSize={11}
                                        fontFamily="Inter, sans-serif"
                                        className="tm-patience-entrylabel"
                                    >
                                        {shortDate(e.d)}
                                    </text>
                                    {/* tooltip on hover / focus */}
                                    {isHover && (
                                        <g>
                                            <rect
                                                x={cx - 96} y={cy - 76}
                                                width={192} height={54} rx={8}
                                                fill="#0e0e16" stroke="var(--s-line)"
                                            />
                                            <text
                                                x={cx} y={cy - 58}
                                                textAnchor="middle"
                                                fill="var(--s-ink)" fontSize={12} fontWeight={600}
                                                fontFamily="Inter, sans-serif"
                                            >
                                                {e.d} · ${e.px.toFixed(2)}
                                            </text>
                                            <text
                                                x={cx} y={cy - 40}
                                                textAnchor="middle"
                                                fill="var(--s-ink2)" fontSize={11}
                                                fontFamily="Inter, sans-serif"
                                            >
                                                {e.contract}
                                            </text>
                                            <text
                                                x={cx} y={cy - 26}
                                                textAnchor="middle"
                                                fill="var(--s-ink3)" fontSize={10.5}
                                                fontFamily="Inter, sans-serif"
                                            >
                                                {`${Math.round(e.hold)} mo held`}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* ─── Legend ─── */}
                    <div className="tm-patience-legend" aria-hidden={false}>
                        <span className="tm-patience-legend-item">
                            <span className="tm-patience-legend-dot" />
                            {c.legendEntry}
                        </span>
                        <span className="tm-patience-legend-item">
                            <span className="tm-patience-legend-swatch" />
                            {c.legendWait}
                        </span>
                    </div>
                </div>

                <div className="tm-patience-cap">{c.cap}</div>

                {/* Consistency line: reconciles the 5.6y window, the 15mo tape
                    verified subset, and the calculator's 36.3% model-priced rate
                    over the same 2021 to 2026 window. */}
                <div className="tm-patience-window">{c.window}</div>
            </div>
        </section>
    );
}
