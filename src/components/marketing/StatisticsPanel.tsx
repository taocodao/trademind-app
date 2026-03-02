'use client';

import React from 'react';
import { useNarration } from './NarrationContext';

const BASE_STATS = {
    totalTrades: 1078,
    winRate: 50.5,
    netPnl: 16811.20, // At 5k base
};

const BASE_YEARLY = [
    { year: 2019, start: 5000.00, trades: 183, winPct: 52.5, pnl: 2401.42, end: 7401.48, retPct: 48.0 },
    { year: 2020, start: 7401.48, trades: 173, winPct: 46.8, pnl: 987.05, end: 8388.56, retPct: 13.3 },
    { year: 2021, start: 8388.56, trades: 178, winPct: 51.1, pnl: 5847.28, end: 14235.79, retPct: 69.7 },
    { year: 2022, start: 14235.79, trades: 87, winPct: 46.0, pnl: -5009.71, end: 9226.07, retPct: -35.1 },
    { year: 2023, start: 9226.07, trades: 178, winPct: 48.3, pnl: 4017.25, end: 13243.28, retPct: 43.5 },
    { year: 2024, start: 13243.28, trades: 147, winPct: 51.7, pnl: 5949.70, end: 19193.04, retPct: 44.9 },
    { year: 2025, start: 19193.04, trades: 132, winPct: 56.8, pnl: 2618.13, end: 21811.20, retPct: 13.6 }
];

export function StatisticsPanel() {
    const { initialInvestment } = useNarration();
    const multiplier = initialInvestment / 5000.0;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatSignedCurrency = (val: number) => {
        const str = formatCurrency(Math.abs(val));
        return val >= 0 ? `+${str}` : `-${str}`;
    };

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="glass-card p-6 border-l-4 border-tm-purple bg-tm-card/60">
                <h3 className="text-xl font-bold text-white mb-4">Vital Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-tm-muted">Total Trades</p>
                        <p className="font-mono text-white text-lg">{BASE_STATS.totalTrades.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-tm-muted">Average Win Rate</p>
                        <p className="font-mono text-tm-green text-lg">{BASE_STATS.winRate}%</p>
                    </div>
                    <div>
                        <p className="text-tm-muted">Total Net PnL</p>
                        <p className="font-mono text-tm-green text-lg">{formatSignedCurrency(BASE_STATS.netPnl * multiplier)}</p>
                    </div>
                    <div>
                        <p className="text-tm-muted">Strategy Distribution</p>
                        <p className="text-white text-xs mt-1">
                            <span className="text-tm-purple font-mono">NAKED_LONG</span> (LEAPS/Puts)<br />
                            <span className="text-tm-purple font-mono border-l border-white/20 pl-2 ml-1">DIAGONAL</span> (PMCCs)<br />
                            <span className="text-tm-purple font-mono border-l border-white/20 pl-2 ml-1">CREDIT_SPREAD</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 overflow-x-auto bg-tm-card/60">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📅</span> Year-by-Year Breakdown
                </h3>
                <table className="w-full text-sm text-left align-middle border-collapse table-auto mt-2 text-nowrap">
                    <thead>
                        <tr className="border-b border-tm-border text-tm-muted uppercase text-xs">
                            <th className="py-2 pr-4">Year</th>
                            <th className="py-2 pr-4 text-right">Start Capital</th>
                            <th className="py-2 pr-4 text-center">Trades</th>
                            <th className="py-2 pr-4 text-right">Win %</th>
                            <th className="py-2 pr-4 text-right">Net PnL</th>
                            <th className="py-2 pr-4 text-right">End Capital</th>
                            <th className="py-2 text-right">Return %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-tm-border/50 text-white font-mono">
                        {BASE_YEARLY.map((row) => (
                            <tr key={row.year} className="hover:bg-white/5 transition-colors group">
                                <td className="py-3 pr-4 font-bold text-tm-purple group-hover:text-tm-purple/80">{row.year}</td>
                                <td className="py-3 pr-4 text-right">{formatCurrency(row.start * multiplier)}</td>
                                <td className="py-3 pr-4 text-center text-tm-muted">{row.trades}</td>
                                <td className="py-3 pr-4 text-right">{row.winPct.toFixed(1)}%</td>
                                <td className={`py-3 pr-4 text-right ${row.pnl >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                                    {formatSignedCurrency(row.pnl * multiplier)}
                                </td>
                                <td className="py-3 pr-4 text-right">{formatCurrency(row.end * multiplier)}</td>
                                <td className={`py-3 text-right ${row.retPct >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                                    {row.retPct >= 0 ? '+' : ''}{row.retPct.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
