'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNarration } from './NarrationContext';

const BASE_STATS = {
    totalTrades: 210,
    cagr: 27.8,
    netPnl: 22821.89, // At 5k base
};

const BASE_YEARLY = [
    { year: 2019, start: 5000.00, trades: 32, pnl: 2074.05, end: 7074.05, retPct: 41.5 },
    { year: 2020, start: 7342.67, trades: 3, pnl: 319.73, end: 7662.40, retPct: 4.4 },
    { year: 2021, start: 7662.40, trades: 31, pnl: 3137.24, end: 10799.64, retPct: 40.9 },
    { year: 2022, start: 11028.41, trades: 7, pnl: -1230.49, end: 9797.91, retPct: -11.2 },
    { year: 2023, start: 9799.87, trades: 37, pnl: 7210.41, end: 17010.28, retPct: 73.6 },
    { year: 2024, start: 16352.58, trades: 56, pnl: 5901.14, end: 22253.72, retPct: 36.1 },
    { year: 2025, start: 22208.40, trades: 44, pnl: 5613.49, end: 27821.89, retPct: 25.3 }
];

const PRO_STATS = {
    totalTrades: 4599,
    cagr: 39.3,
    netPnl: 57229.64, // At 5k base
};

const PRO_YEARLY = [
    { year: 2019, start: 5000.00, trades: 918, pnl: 2907.87, end: 7907.87, retPct: 58.2 },
    { year: 2020, start: 8313.89, trades: 144, pnl: 427.79, end: 8741.68, retPct: 5.1 },
    { year: 2021, start: 8741.68, trades: 683, pnl: 3256.02, end: 11997.70, retPct: 37.2 },
    { year: 2022, start: 12206.58, trades: 120, pnl: 2610.45, end: 14817.03, retPct: 21.4 },
    { year: 2023, start: 14528.03, trades: 829, pnl: 21584.76, end: 36112.79, retPct: 148.6 },
    { year: 2024, start: 34178.12, trades: 969, pnl: 11286.84, end: 45464.96, retPct: 33.0 },
    { year: 2025, start: 45149.31, trades: 780, pnl: 20683.41, end: 65832.72, retPct: 45.8 },
    { year: 2026, start: 65554.14, trades: 156, pnl: -3324.51, end: 62229.64, retPct: -5.1 }
];

export function StatisticsPanel({
    strategyMode,
    setStrategyMode
}: {
    strategyMode: 'standard' | 'pro';
    setStrategyMode: (mode: 'standard' | 'pro') => void;
}) {
    const { t } = useTranslation();
    const { initialInvestment } = useNarration();
    const multiplier = initialInvestment / 5000.0;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatSignedCurrency = (val: number) => {
        const str = formatCurrency(Math.abs(val));
        return val >= 0 ? `+${str}` : `-${str}`;
    };

    const currentStats = strategyMode === 'pro' ? PRO_STATS : BASE_STATS;
    const currentYearly = strategyMode === 'pro' ? PRO_YEARLY : BASE_YEARLY;

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Legal Disclaimer Label */}
            <div className="w-full text-center text-[10px] text-tm-muted uppercase tracking-widest font-mono bg-tm-card/30 p-2 rounded-lg border border-white/5 shadow-inner">
                {t('timeline.disclaimer')}
            </div>

            {/* Strategy Toggle Tab */}
            <div className="flex bg-tm-card/40 p-1 rounded-xl border border-white/10 w-full max-w-sm mx-auto shadow-lg relative z-20">
                <button
                    onClick={() => setStrategyMode('standard')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${strategyMode === 'standard' ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white hover:bg-white/5'}`}
                >
                    TurboCore (Standard)
                </button>
                <div className="relative flex-1">
                    <button
                        onClick={() => setStrategyMode('pro')}
                        className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${strategyMode === 'pro' ? 'bg-gradient-to-r from-tm-purple to-tm-blue text-white shadow-md' : 'text-tm-muted hover:text-white hover:bg-white/5'}`}
                    >
                        TurboCore Pro ML
                    </button>
                    <span className="absolute -top-2 -right-2 bg-tm-blue text-[9px] uppercase font-bold text-white px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                        NEW
                    </span>
                </div>
            </div>

            <div className={`glass-card p-6 border-l-4 ${strategyMode === 'pro' ? 'border-tm-blue' : 'border-tm-purple'} bg-tm-card/60 relative z-10 transition-all duration-300`}>
                <h3 className="text-xl font-bold text-white mb-4">
                    {strategyMode === 'pro' ? 'TurboCore Pro ML Statistics' : t('stats.title')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-tm-muted">{t('stats.total_trades')}</p>
                        <p className="font-mono text-white text-lg">{currentStats.totalTrades.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-tm-muted">{t('stats.cagr')}</p>
                        <p className="font-mono text-tm-green text-lg">{currentStats.cagr}%</p>
                    </div>
                    <div>
                        <p className="text-tm-muted">{t('stats.net_pnl')}</p>
                        <p className="font-mono text-tm-green text-lg">{formatSignedCurrency(currentStats.netPnl * multiplier)}</p>
                    </div>
                    <div>
                        <p className="text-tm-muted">{t('stats.strategy_dist')}</p>
                        <p className="text-white text-xs mt-1">
                            {strategyMode === 'pro' ? (
                                <>
                                    <span className="text-tm-purple font-mono">LEAPS/QQQ</span> (Bull Focus)<br />
                                    <span className="text-tm-blue font-mono border-l border-white/20 pl-2 ml-1">SGOV/QLD</span> (Hedging)<br />
                                </>
                            ) : (
                                <>
                                    <span className="text-tm-purple font-mono">AGGRESSIVE</span> (TQQQ Focus)<br />
                                    <span className="text-tm-purple font-mono border-l border-white/20 pl-2 ml-1">DEFENSIVE</span> (SGOV/Cash)<br />
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 overflow-x-auto bg-tm-card/60 relative z-10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📅</span> {t('stats.breakdown')}
                </h3>
                <table className="w-full text-sm text-left align-middle border-collapse table-auto mt-2 text-nowrap">
                    <thead>
                        <tr className="border-b border-tm-border text-tm-muted uppercase text-xs">
                            <th className="py-2 pr-4">{t('stats.th_year')}</th>
                            <th className="py-2 pr-4 text-right">{t('stats.th_start')}</th>
                            <th className="py-2 pr-4 text-center">{t('stats.th_trades')}</th>
                            <th className="py-2 pr-4 text-right">{t('stats.th_net')}</th>
                            <th className="py-2 pr-4 text-right">{t('stats.th_end')}</th>
                            <th className="py-2 text-right">{t('stats.th_ret')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-tm-border/50 text-white font-mono transition-all duration-300">
                        {currentYearly.map((row) => (
                            <tr key={`${strategyMode}-${row.year}`} className="hover:bg-white/5 transition-colors group animate-in fade-in duration-300">
                                <td className={`py-3 pr-4 font-bold ${strategyMode === 'pro' ? 'text-tm-blue group-hover:text-tm-blue/80' : 'text-tm-purple group-hover:text-tm-purple/80'}`}>{row.year}</td>
                                <td className="py-3 pr-4 text-right">{formatCurrency(row.start * multiplier)}</td>
                                <td className="py-3 pr-4 text-center text-tm-muted">{row.trades}</td>
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
