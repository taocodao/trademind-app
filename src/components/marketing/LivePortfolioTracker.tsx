'use client';

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface NavPoint { date: string; nav: number; }

interface StrategyAccount {
    strategy:      string;
    name:          string;
    initial:       number;
    nav:           number;
    total_return:  number;
    cagr:          number;
    max_drawdown:  number;
    trade_count:   number;
    inception_date: string | null;
    last_data_date: string | null;
    nav_history:   NavPoint[];
    is_placeholder: boolean;
}

interface PortfolioSummary {
    accounts:     StrategyAccount[];
    delay_days:   number;
    generated_at: string;
    data_through: string | null;
}

// ── Sparkline (inline SVG) ──────────────────────────────────────────────────
function Sparkline({ data, positive }: { data: NavPoint[]; positive: boolean }) {
    const width = 120;
    const height = 36;
    const padding = 2;

    if (!data || data.length < 2) {
        return (
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <line x1="0" y1={height / 2} x2={width} y2={height / 2}
                    stroke="#334155" strokeWidth="1.5" />
            </svg>
        );
    }

    const navs = data.map(d => d.nav);
    const minV  = Math.min(...navs);
    const maxV  = Math.max(...navs);
    const range = maxV - minV || 1;

    const pts = data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((d.nav - minV) / range) * (height - 2 * padding);
        return `${x},${y}`;
    });

    const polyline = pts.join(' ');
    const firstPt  = pts[0].split(',');
    const lastPt   = pts[pts.length - 1].split(',');
    const fillPath = `M ${firstPt[0]},${height} L ${polyline} L ${lastPt[0]},${height} Z`;

    const color      = positive ? '#22c55e' : '#ef4444';
    const fillColor  = positive ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)';

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                <linearGradient id={`grad-${positive}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={fillPath} fill={`url(#grad-${positive})`} />
            <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round" />
            {/* current dot */}
            <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill={color} />
        </svg>
    );
}

// ── Animated Counter ────────────────────────────────────────────────────────
function CountUp({ value, decimals = 1, prefix = '', suffix = '' }: {
    value: number; decimals?: number; prefix?: string; suffix?: string;
}) {
    const [display, setDisplay] = useState(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const start    = performance.now();
        const duration = 900; // ms
        const from     = 0;
        const to       = value;

        const animate = (now: number) => {
            const t   = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
            setDisplay(from + (to - from) * ease);
            if (t < 1) frameRef.current = requestAnimationFrame(animate);
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [value]);

    return (
        <span>{prefix}{display.toFixed(decimals)}{suffix}</span>
    );
}

// ── Strategy badge colors ────────────────────────────────────────────────────
const STRATEGY_STYLES: Record<string, { badge: string; glow: string; border: string }> = {
    TQQQ_TURBOCORE: {
        badge:  'bg-blue-500/15 text-blue-300 border-blue-500/30',
        glow:   'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]',
        border: 'border-blue-500/20 hover:border-blue-500/40',
    },
    TURBOCORE_PRO: {
        badge:  'bg-purple-500/15 text-purple-300 border-purple-500/30',
        glow:   'hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]',
        border: 'border-purple-500/20 hover:border-purple-500/40',
    },
    QQQ_LEAPS: {
        badge:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        glow:   'hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]',
        border: 'border-emerald-500/20 hover:border-emerald-500/40',
    },
};

// ── Single Strategy Card ──────────────────────────────────────────────────────
function StrategyCard({ acct, animated }: { acct: StrategyAccount; animated: boolean }) {
    const isPositive   = acct.total_return >= 0;
    const styles       = STRATEGY_STYLES[acct.strategy] ?? STRATEGY_STYLES.QQQ_LEAPS;
    const TrendIcon    = isPositive ? TrendingUp : (acct.total_return < -5 ? TrendingDown : Minus);
    const trendColor   = isPositive ? 'text-emerald-400' : 'text-red-400';
    const returnColor  = isPositive ? 'text-emerald-400' : 'text-red-400';

    const formattedNav  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(acct.nav);
    const formattedInit = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(acct.initial);

    return (
        <div className={`relative flex flex-col gap-4 rounded-2xl border bg-white/[0.03] backdrop-blur-sm p-5 transition-all duration-300 ${styles.border} ${styles.glow}`}>

            {/* Top row: name + live badge */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles.badge}`}>
                        {acct.name}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 relative" />
                    <span className="text-xs text-emerald-400/80 font-medium">LIVE</span>
                </div>
            </div>

            {/* NAV */}
            <div>
                <p className="text-xs text-slate-500 mb-0.5">Portfolio Value</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                    {acct.is_placeholder
                        ? formattedInit
                        : (animated ? <CountUp value={acct.nav} decimals={0} prefix="$" /> : formattedNav)
                    }
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                    Started at <span className="text-slate-400">{formattedInit}</span>
                </p>
            </div>

            {/* Sparkline */}
            <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Return */}
                        <div>
                            <p className="text-[10px] text-slate-500">Total Return</p>
                            <p className={`text-sm font-semibold ${returnColor}`}>
                                {isPositive ? '+' : ''}{acct.total_return.toFixed(1)}%
                            </p>
                        </div>
                        {/* CAGR */}
                        <div>
                            <p className="text-[10px] text-slate-500">CAGR</p>
                            <p className={`text-sm font-semibold ${returnColor}`}>
                                {acct.cagr > 0 ? '+' : ''}{acct.cagr.toFixed(1)}%
                            </p>
                        </div>
                        {/* MaxDD */}
                        <div>
                            <p className="text-[10px] text-slate-500">Max DD</p>
                            <p className="text-sm font-semibold text-amber-400">
                                {acct.max_drawdown.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 opacity-80">
                    <Sparkline data={acct.nav_history} positive={isPositive} />
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div className="flex items-center gap-1 text-slate-600">
                    <Activity className="w-3 h-3" />
                    <span className="text-[10px]">{acct.trade_count} trades</span>
                </div>
                <div className="flex items-center gap-1">
                    <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                    {acct.last_data_date && (
                        <span className="text-[10px] text-slate-600">
                            as of {acct.last_data_date}
                        </span>
                    )}
                </div>
            </div>

            {/* Placeholder overlay */}
            {acct.is_placeholder && (
                <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                    <p className="text-xs text-slate-400 font-medium">Live tracking starts soon</p>
                </div>
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function LivePortfolioTracker() {
    const [data, setData]         = useState<PortfolioSummary | null>(null);
    const [loading, setLoading]   = useState(true);
    const [animated, setAnimated] = useState(false);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/virtual-accounts/portfolio-summary', { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                setData(json);
                // Trigger count-up animation after initial render
                setTimeout(() => setAnimated(true), 100);
            }
        } catch (err) {
            console.error('[LivePortfolioTracker] fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="w-full max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 h-48 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.accounts.length === 0) return null;

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-white">
                        Live Strategy Portfolios
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Paper trading • {data.delay_days}-day delayed data
                        {data.data_through && (
                            <> • through <span className="text-slate-400">{data.data_through}</span></>
                        )}
                    </p>
                </div>
                <div className="text-[10px] text-slate-600 text-right">
                    Not financial advice
                </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.accounts.map(acct => (
                    <StrategyCard key={acct.strategy} acct={acct} animated={animated} />
                ))}
            </div>
        </div>
    );
}
