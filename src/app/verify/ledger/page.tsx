'use client';

/* /verify/ledger - interactive audit ledger for the published QQQ LEAPS
   backtest record: QQQ candles + model equity curve with every one of the
   806 fills marked, and a virtualized ledger whose rows expand to pricing
   inputs, costs, triggering rule, and compact 7-gate pass/fail badges at
   decision time.

   COMPLIANCE (deep-research verdict, Sep 7 2026):
   - Every interactive view (chart tooltip, expanded row) carries its own
     hypothetical-performance disclaimer and the model-priced tag. This is
     the Rule 4.41 "immediate proximity" standard applied per view. Do not
     remove or relocate these.
   - No visitor inputs of any kind are allowed on this page. The content is
     a fixed, identical-for-everyone view of the historical record. Any
     future feature that accepts user capital/dates/parameters changes the
     legal posture and is permanently out of scope.
   - Per-fill numeric thresholds and IV/VRP values are withheld pending
     attorney sign-off; only gate names + pass/fail ship. */

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    createChart,
    createSeriesMarkers,
    ColorType,
    CandlestickSeries,
    LineSeries,
    type MouseEventParams,
    type Time,
} from 'lightweight-charts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { LegalFooter } from '@/components/marketing/LegalFooter';
import { LEDGER_COPY, LedgerLang } from '@/components/marketing/verify/ledgerCopy';
import chartData from '@/data/ledger-chart.json';
import rowsData from '@/data/ledger-rows.json';
import './ledger.css';

interface FillRow {
    i: number;
    ts: string;
    kind: string;
    action: string;
    strike: number;
    expiry: string;
    contracts: number;
    price: number;
    spot: number;
    iv: number;
    delta: number;
    slippage: number;
    commission: number;
    pnl: number;
    reason: string;
    gates: Record<string, boolean> | null;
}

const ROWS = (rowsData as { fills: FillRow[] }).fills;
const CHART = chartData as {
    candles: { time: string; open: number; high: number; low: number; close: number }[];
    equity: { time: string; value: number }[];
    markers: { time: string; position: string; color: string; shape: string; id: string }[];
};

const fmt2 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt4 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

export default function LedgerPage() {
    const { i18n } = useTranslation();
    const base = (i18n.language || 'en').split('-')[0];
    const lang: LedgerLang = base === 'es' ? 'es' : base === 'zh' ? 'zh' : 'en';
    const c = LEDGER_COPY[lang];

    const [filter, setFilter] = useState<'all' | 'leaps' | 'short'>('all');
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const [tip, setTip] = useState<{ x: number; y: number; fill: FillRow } | null>(null);

    const filtered = useMemo(
        () =>
            ROWS.filter((r) =>
                filter === 'all' ? true : filter === 'leaps' ? r.kind === 'LEAPS' : r.kind !== 'LEAPS'
            ),
        [filter]
    );

    // ---------- chart ----------
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = chartRef.current;
        if (!el) return;
        const chart = createChart(el, {
            layout: {
                background: { type: ColorType.Solid, color: '#14141f' },
                textColor: '#b7b7c9',
                fontSize: 11,
            },
            grid: {
                vertLines: { color: '#1e1e2e' },
                horzLines: { color: '#1e1e2e' },
            },
            rightPriceScale: { borderColor: '#262636' },
            timeScale: { borderColor: '#262636', timeVisible: false },
            width: el.clientWidth,
            height: el.clientHeight,
        });

        const candles = chart.addSeries(CandlestickSeries, {
            upColor: '#4b5563',
            downColor: '#374151',
            borderVisible: false,
            wickUpColor: '#4b5563',
            wickDownColor: '#374151',
        });
        candles.setData(CHART.candles.map((k) => ({ ...k, time: k.time as Time })));

        const eq = chart.addSeries(LineSeries, {
            color: '#22c55e',
            lineWidth: 2,
            priceScaleId: 'left',
            lastValueVisible: false,
            priceLineVisible: false,
        });
        chart.priceScale('left').applyOptions({ visible: true, borderColor: '#262636' });
        eq.setData(CHART.equity.map((p) => ({ ...p, time: p.time as Time })));

        createSeriesMarkers(
            candles,
            CHART.markers.map((m) => ({
                time: m.time as Time,
                position: m.position as 'aboveBar' | 'belowBar',
                color: m.color,
                shape: m.shape as 'arrowUp' | 'arrowDown',
                size: 1,
                id: m.id,
            }))
        );

        chart.timeScale().fitContent();

        chart.subscribeClick((param: MouseEventParams) => {
            if (!param.time || !param.point) {
                setTip(null);
                return;
            }
            const timeStr = String(param.time);
            const hits = CHART.markers.filter((m) => m.time === timeStr);
            if (hits.length === 0) {
                setTip(null);
                return;
            }
            const fill = ROWS.find((r) => `${r.ts}|${r.action}` === hits[0].id);
            if (fill) {
                setTip({ x: param.point.x, y: param.point.y, fill });
            }
        });

        const onResize = () => {
            if (chartRef.current) {
                chart.applyOptions({ width: chartRef.current.clientWidth, height: chartRef.current.clientHeight });
            }
        };
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            chart.remove();
        };
    }, []);

    const openFromTip = useCallback(() => {
        if (!tip) return;
        setFilter('all');
        setOpenIdx(tip.fill.i);
        setTip(null);
        requestAnimationFrame(() => {
            document.getElementById(`ldg-row-${tip.fill.i}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    }, [tip]);

    // ---------- virtualized rows ----------
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: filtered.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (idx) => (filtered[idx].i === openIdx ? 320 : 38),
        overscan: 10,
        getItemKey: (idx) => filtered[idx].i,
    });

    useEffect(() => {
        virtualizer.measure();
    }, [openIdx, filter, virtualizer]);

    const toggleRow = useCallback((i: number) => {
        setOpenIdx((cur) => (cur === i ? null : i));
        setTip(null);
    }, []);

    return (
        <main className="min-h-screen flex flex-col bg-[#0A0A0F] overflow-x-hidden pt-16">
            <MarketingHeader />
            {/* SEO / accessibility summary: static, always rendered */}
            <p className="sr-only">{c.seoSummary}</p>

            <div className="ldg-wrap">
                <header className="ldg-hero">
                    <div className="ldg-eyebrow">{c.eyebrow}</div>
                    <h1 className="ldg-h1">{c.title}</h1>
                    <p className="ldg-sub">{c.sub}</p>
                    <div className="ldg-tagline">{c.modelTagLine}</div>
                </header>

                {/* Chart audit */}
                <section className="ldg-section">
                    <h2 className="ldg-h2">{c.chartTitle}</h2>
                    <p className="ldg-note">{c.chartNote}</p>
                    <div className="ldg-chart-panel" style={{ position: 'relative' }}>
                        <div ref={chartRef} className="ldg-chart" />
                        {tip && (
                            <div
                                className="ldg-tip"
                                style={{
                                    left: Math.min(tip.x + 12, (chartRef.current?.clientWidth ?? 400) - 300),
                                    top: Math.max(tip.y - 10, 8),
                                    pointerEvents: 'auto',
                                }}
                                onClick={openFromTip}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && openFromTip()}
                            >
                                <div>
                                    <b>{tip.fill.ts.slice(0, 16)}</b> - {tip.fill.action}
                                </div>
                                <div>
                                    {c.colStrike} {fmt2(tip.fill.strike)} / {c.colPrice} {fmt2(tip.fill.price)}
                                </div>
                                <div>
                                    {c.colWhy}: {tip.fill.reason}
                                </div>
                                <div className="tt-dis">{c.tooltipDisclaimer}</div>
                            </div>
                        )}
                    </div>
                    <div className="ldg-legend">
                        <span className="lg-qqq">{c.chartLegendQqq}</span>
                        <span className="lg-eq">{c.chartLegendEquity}</span>
                        <span className="lg-leaps">{c.chartLegendLeaps}</span>
                        <span className="lg-short">{c.chartLegendShort}</span>
                    </div>
                </section>

                {/* Ledger */}
                <section className="ldg-section">
                    <h2 className="ldg-h2">{c.ledgerTitle}</h2>
                    <p className="ldg-note">{c.ledgerNote}</p>

                    <div className="ldg-toolbar">
                        <button className={`ldg-filter ${filter === 'all' ? 'ldg-active' : ''}`} onClick={() => setFilter('all')}>
                            {c.filterAll}
                        </button>
                        <button
                            className={`ldg-filter ${filter === 'leaps' ? 'ldg-active' : ''}`}
                            onClick={() => setFilter('leaps')}
                        >
                            {c.filterLeaps}
                        </button>
                        <button
                            className={`ldg-filter ${filter === 'short' ? 'ldg-active' : ''}`}
                            onClick={() => setFilter('short')}
                        >
                            {c.filterShorts}
                        </button>
                        <span className="ldg-count">
                            {filtered.length} {c.showing}
                        </span>
                    </div>

                    <div className="ldg-head" role="row">
                        <span>{c.colDate}</span>
                        <span>{c.colInstrument}</span>
                        <span>{c.colAction}</span>
                        <span>{c.colStrike}</span>
                        <span>{c.colPrice}</span>
                        <span>{c.colPnl}</span>
                        <span>{c.colWhy}</span>
                    </div>

                    <div ref={parentRef} className="ldg-scroll" role="table" aria-label={c.ledgerTitle}>
                        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', minWidth: 860 }}>
                            {virtualizer.getVirtualItems().map((vi) => {
                                const r = filtered[vi.index];
                                return (
                                    <LedgerRow
                                        key={vi.key}
                                        row={r}
                                        open={openIdx === r.i}
                                        top={vi.start}
                                        onToggle={() => toggleRow(r.i)}
                                        c={c}
                                        measureRef={virtualizer.measureElement}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </section>

                <Link href="/verify" className="ldg-back">
                    {c.backToVerify}
                </Link>
            </div>
            <LegalFooter />
        </main>
    );
}

function LedgerRow({
    row,
    open,
    top,
    onToggle,
    c,
    measureRef,
}: {
    row: FillRow;
    open: boolean;
    top: number;
    onToggle: () => void;
    c: (typeof LEDGER_COPY)['en'];
    measureRef: (el: HTMLElement | null) => void;
}) {
    const gates: [string, boolean][] = row.gates ? (Object.entries(row.gates) as [string, boolean][]) : [];
    return (
        <div
            id={`ldg-row-${row.i}`}
            ref={measureRef}
            data-index={row.i}
            role="row"
            style={{ position: 'absolute', top, left: 0, width: '100%' }}
        >
            <div
                className={`ldg-row-main ${open ? 'ldg-open' : ''}`}
                onClick={onToggle}
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
            >
                <span>{row.ts.slice(0, 16)}</span>
                <span>{row.kind === 'LEAPS' ? c.kindLeaps : c.kindShort}</span>
                <span>{row.action}</span>
                <span>{fmt2(row.strike)}</span>
                <span>${fmt2(row.price)}</span>
                <span className={row.pnl > 0 ? 'ldg-pos' : row.pnl < 0 ? 'ldg-neg' : ''}>
                    {row.pnl !== 0 ? `$${fmt2(row.pnl)}` : '-'}
                </span>
                <span>{row.reason}</span>
            </div>

            {open && (
                <div className="ldg-detail">
                    <div className="ldg-detail-grid">
                        <div className="ldg-detail-item">
                            <b>{c.colExpiry}</b>
                            <span>{row.expiry}</span>
                        </div>
                        <div className="ldg-detail-item">
                            <b>{c.colContracts}</b>
                            <span>{row.contracts}</span>
                        </div>
                        <div className="ldg-detail-item">
                            <b>{c.colSpot}</b>
                            <span>${fmt2(row.spot)}</span>
                        </div>
                        <div className="ldg-detail-item">
                            <b>{c.colIv}</b>
                            <span>{pct(row.iv)}</span>
                        </div>
                        <div className="ldg-detail-item">
                            <b>{c.colDelta}</b>
                            <span>{fmt4(row.delta)}</span>
                        </div>
                        <div className="ldg-detail-item">
                            <b>{c.colSlippage}</b>
                            <span>${fmt2(row.slippage)}</span>
                        </div>
                        <div className="ldg-detail-item">
                            <b>{c.colCommission}</b>
                            <span>${fmt2(row.commission)}</span>
                        </div>
                    </div>

                    {gates.length > 0 && (
                        <>
                            <div className="ldg-gates-title">{c.gatesTitle}</div>
                            <div className="ldg-gate-badges">
                                {gates.map(([k, v]) => (
                                    <span key={k} className={`ldg-badge ${v ? 'ldg-pass' : 'ldg-fail'}`}>
                                        {c.gateBadges[k] ?? k}: {v ? c.pass : c.fail}
                                    </span>
                                ))}
                            </div>
                            <div className="ldg-gates-note">{c.gatesNote}</div>
                        </>
                    )}

                    <div className="ldg-inline-dis">{c.detailDisclaimer}</div>
                </div>
            )}
        </div>
    );
}
