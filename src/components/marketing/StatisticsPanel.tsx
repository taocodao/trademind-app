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

export function StatisticsPanel() {
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

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Legal Disclaimer Label */}
            <div className="w-full text-center text-[10px] text-tm-muted uppercase tracking-widest font-mono bg-tm-card/30 p-2 rounded-lg border border-white/5 shadow-inner">
                {t('timeline.disclaimer')}
            </div>

            <div className="glass-card p-6 border-l-4 border-tm-purple bg-tm-card/60">
                <h3 className="text-xl font-bold text-white mb-4">{t('stats.title')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-tm-muted">{t('stats.total_trades')}</p>
                        <p className="font-mono text-white text-lg">{BASE_STATS.totalTrades.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-tm-muted">{t('stats.cagr')}</p>
                        <p className="font-mono text-tm-green text-lg">{BASE_STATS.cagr}%</p>
                    </div>
                    <div>
                        <p className="text-tm-muted">{t('stats.net_pnl')}</p>
                        <p className="font-mono text-tm-green text-lg">{formatSignedCurrency(BASE_STATS.netPnl * multiplier)}</p>
                    </div>
                    <div>
                        <p className="text-tm-muted">{t('stats.strategy_dist')}</p>
                        <p className="text-white text-xs mt-1">
                            <span className="text-tm-purple font-mono">AGGRESSIVE</span> (TQQQ Focus)<br />
                            <span className="text-tm-purple font-mono border-l border-white/20 pl-2 ml-1">DEFENSIVE</span> (SGOV/Cash)<br />
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 overflow-x-auto bg-tm-card/60">
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
                    <tbody className="divide-y divide-tm-border/50 text-white font-mono">
                        {BASE_YEARLY.map((row) => (
                            <tr key={row.year} className="hover:bg-white/5 transition-colors group">
                                <td className="py-3 pr-4 font-bold text-tm-purple group-hover:text-tm-purple/80">{row.year}</td>
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
