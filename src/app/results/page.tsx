/**
 * /results — TradeMind Live Track Record Page
 * =============================================
 * Server component. Fetches from /api/signals/track-record and renders
 * a public, SEO-friendly table of the last 90 days of signal history
 * with auto-populated QQQ 5-day returns.
 *
 * This page is linked from every TikTok video bio and every Whop listing FAQ.
 */

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Live Signal Track Record | TradeMind',
    description:
        'Every TurboCore ML regime signal since 2026 — date, regime called, confidence, and 5-day QQQ return outcome. Verified, timestamped, and updated daily.',
};

const REGIME_COLOR: Record<string, string> = {
    BULL:     '#22c55e',
    SIDEWAYS: '#eab308',
    BEAR:     '#ef4444',
};

const REGIME_BADGE: Record<string, string> = {
    BULL:     'bg-green-500/15 text-green-400 border-green-500/30',
    SIDEWAYS: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    BEAR:     'bg-red-500/15 text-red-400 border-red-500/30',
};

interface SignalRow {
    signal_date:           string;
    regime:                string;
    confidence:            number;
    qqq_return_5d:         number | null;
    qqq_price_signal_date: number | null;
    qqq_price_5d_later:    number | null;
}

interface TrackRecordData {
    signals: SignalRow[];
    summary: {
        total: number; bullCount: number; sidewaysCount: number; bearCount: number;
        avgConfidence: number; avgReturn: number | null; winRate: number | null;
    };
    lastUpdated: string | null;
}

async function getTrackRecord(): Promise<TrackRecordData | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
        const res = await fetch(`${baseUrl}/api/signals/track-record`, {
            next: { revalidate: 300 },
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export default async function ResultsPage() {
    const data = await getTrackRecord();

    return (
        <main
            className="min-h-screen bg-[#070710] text-white"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
        >
            {/* Background glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/8 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-16">

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-purple-400 text-sm font-medium mb-6">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                        Live Track Record — Updated Daily
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
                        Every Signal. Every Outcome.
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                        TurboCore publishes one ML regime signal per trading day. The 5-day QQQ return
                        is recorded automatically at market close 5 trading days later.
                        No cherry-picking. No back-fill.
                    </p>
                </div>

                {/* Summary stats */}
                {data && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                        {[
                            {
                                label: 'Signals (90d)',
                                value: data.summary.total.toString(),
                                sub:   `${data.summary.bullCount}B / ${data.summary.sidewaysCount}S / ${data.summary.bearCount}Bear`,
                            },
                            {
                                label: 'Avg Confidence',
                                value: `${data.summary.avgConfidence}%`,
                                sub:   'Model certainty score',
                            },
                            {
                                label: 'Avg 5D QQQ Return',
                                value: data.summary.avgReturn !== null ? `${data.summary.avgReturn > 0 ? '+' : ''}${data.summary.avgReturn}%` : 'Pending',
                                sub:   data.summary.avgReturn !== null ? 'On populated signals' : 'Data populating',
                                color: data.summary.avgReturn !== null
                                    ? data.summary.avgReturn > 0 ? '#22c55e' : '#ef4444'
                                    : undefined,
                            },
                            {
                                label: 'Win Rate (5D)',
                                value: data.summary.winRate !== null ? `${data.summary.winRate}%` : 'Pending',
                                sub:   '% signals QQQ > 0',
                                color: '#a78bfa',
                            },
                        ].map(({ label, value, sub, color }) => (
                            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-gray-500 text-xs mb-1">{label}</p>
                                <p className="text-2xl font-bold" style={color ? { color } : undefined}>{value}</p>
                                <p className="text-gray-600 text-xs mt-1">{sub}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Signal table */}
                <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden mb-10">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Regime Called</th>
                                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Confidence</th>
                                    <th className="text-right px-4 py-3 text-gray-400 font-medium">QQQ at Signal</th>
                                    <th className="text-right px-4 py-3 text-gray-400 font-medium">QQQ +5D</th>
                                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Return</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!data || data.signals.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-16 text-gray-600">
                                            Signal history will appear here after the first signals are published.
                                        </td>
                                    </tr>
                                ) : (
                                    data.signals.map((row) => {
                                        const ret = row.qqq_return_5d;
                                        const retColor = ret === null ? '#6b7280'
                                            : ret > 0 ? '#22c55e' : '#ef4444';
                                        return (
                                            <tr
                                                key={row.signal_date}
                                                className="border-b border-white/5 hover:bg-white/3 transition-colors"
                                            >
                                                <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                                                    {row.signal_date}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs font-semibold ${REGIME_BADGE[row.regime] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}
                                                    >
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full inline-block"
                                                            style={{ background: REGIME_COLOR[row.regime] ?? '#6b7280' }}
                                                        />
                                                        {row.regime}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-300">
                                                    {row.confidence}%
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs">
                                                    {row.qqq_price_signal_date !== null
                                                        ? `$${row.qqq_price_signal_date.toFixed(2)}`
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs">
                                                    {row.qqq_price_5d_later !== null
                                                        ? `$${row.qqq_price_5d_later.toFixed(2)}`
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold font-mono" style={{ color: retColor }}>
                                                    {ret !== null
                                                        ? `${ret > 0 ? '+' : ''}${ret.toFixed(2)}%`
                                                        : 'Pending'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data?.lastUpdated && (
                        <p className="text-gray-600 text-xs text-right px-4 py-2 border-t border-white/5">
                            Returns last updated: {new Date(data.lastUpdated).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
                        </p>
                    )}
                </div>

                {/* Disclaimer */}
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 mb-10 text-sm text-gray-400 leading-relaxed">
                    <p className="font-semibold text-yellow-400 mb-2">Important Disclosures</p>
                    <p>
                        The 5-day QQQ return shown is the market return following the regime signal — it does
                        not represent actual trading results, account performance, or guaranteed returns.
                        TradeMind signals are <strong className="text-white">educational analysis only</strong> and
                        are not personalized investment advice. Past signal outcomes do not guarantee future results.
                        All investing involves risk, including possible loss of principal.
                        The 7-year backtest (2018–2024) was conducted using walk-forward methodology on historical
                        data — it was never trained on future data and should not be interpreted as a live performance record.
                    </p>
                </div>

                {/* CTA */}
                <div className="text-center bg-gradient-to-b from-purple-600/10 to-transparent border border-purple-500/20 rounded-2xl p-10">
                    <h2 className="text-2xl font-bold mb-3">See This System Live</h2>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        The same ML regime model that generated this track record publishes a live signal
                        every trading day at 3 PM ET. $15 unlocks 30 days of full access.
                    </p>
                    <a
                        href="https://whop.com/trademindbot/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_50px_rgba(124,58,237,0.6)]"
                    >
                        Start $15 Trial on Whop →
                    </a>
                    <p className="text-gray-600 text-xs mt-4">30-day trial · No commitment · $15 becomes a credit toward any plan</p>
                </div>

                {/* Back link */}
                <div className="text-center mt-8">
                    <Link href="/" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
                        ← Back to TradeMind
                    </Link>
                </div>

            </div>
        </main>
    );
}
