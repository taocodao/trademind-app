'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useNarration } from './NarrationContext';

interface DataPoint {
    date: string;
    value: number;
    pnl?: number;
    progress?: number;
}

export function InteractiveTimeline({ data, strategyMode = 'standard' }: { data: DataPoint[], strategyMode?: 'standard' | 'pro' }) {
    const { t } = useTranslation();
    const { initialInvestment, setInitialInvestment } = useNarration();

    // Scale data to initial investment (base is 5000)
    const multiplier = initialInvestment / 5000.0;

    const plottedData = data.map(d => ({
        ...d,
        value: d.value * multiplier,
        pnl: (d.pnl || 0) * multiplier,
    }));

    // Get final Portfolio Value
    const currentPortfolioValue = plottedData.length > 0
        ? plottedData[plottedData.length - 1].value
        : 5000 * multiplier;

    const chartColor = strategyMode === 'pro' ? '#3B82F6' : '#7C3AED';

    return (
        <div className="w-full flex flex-col gap-6">

            {/* Top Stat Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-card p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 w-full">
                    <div>
                        <h2 className="text-tm-muted text-sm font-semibold uppercase tracking-wider">{t('timeline.total')}</h2>
                        <div className="text-4xl font-mono font-bold text-white mt-1">
                            ${currentPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Interactive Simulator Slider */}
                    <div className="flex flex-col gap-2 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-8 w-full md:w-auto">
                        <label className="text-xs text-tm-muted uppercase tracking-wider font-semibold">{t('timeline.principal')}</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="1000"
                                max="100000"
                                step="1000"
                                value={initialInvestment}
                                onChange={(e) => setInitialInvestment(Number(e.target.value))}
                                className={`w-32 cursor-pointer appearance-none bg-tm-border h-1.5 rounded-lg ${strategyMode === 'pro' ? 'accent-tm-blue' : 'accent-tm-purple'}`}
                            />
                            <span className="text-white font-mono font-bold text-lg">${initialInvestment.toLocaleString()}</span>
                            {initialInvestment === 5000 && <span className="bg-tm-green/20 text-tm-green px-2 py-0.5 rounded text-[10px] uppercase ml-2">{t('timeline.verified')}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Interactive Chart */}
            <div className="w-full h-[400px] glass-card p-6 relative transition-all duration-500">
                <div className="absolute top-4 right-6 text-[10px] text-tm-muted uppercase tracking-widest z-10 font-mono">
                    HYPOTHETICAL BACKTESTED RESULTS — NOT ACTUAL TRADING
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={plottedData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            stroke="#334155"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(val) => val.split('-')[0]}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="#334155"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(val) => `$${val.toLocaleString()}`}
                            domain={['dataMin - 1000', 'dataMax + 2000']}
                            hide={true}
                            width={80}
                            orientation="right"
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length && payload[0].value !== null) {
                                    const val = payload[0].value;
                                    const year = new Date(label as string | number).getFullYear();
                                    let narrative = "";

                                    if (strategyMode === 'pro') {
                                        switch (year) {
                                            case 2019: narrative = `Starting with just $${(5000 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })}... the ML engine executed 918 strategic rotations, generating a +58.2% return in its first year.`; break;
                                            case 2020: narrative = `During the 2020 COVID chaos, the portfolio protected capital and remained highly stable, finishing the year positively.`; break;
                                            case 2021: narrative = `2021 yielded a strong +37.2% return. Multi-asset hedging effectively neutralized high-volatility pullbacks.`; break;
                                            case 2022: narrative = `When TQQQ crashed nearly 80% in 2022, the ML model successfully rotated into SGOV and ended the year UP +21.4%.`; break;
                                            case 2023: narrative = `As the market recovered in 2023, the algorithm aggressively favored QQQ LEAPS, driving an unprecedented +148.6% growth.`; break;
                                            case 2024: narrative = `2024 delivered another stellar +33.0% performance, growing the original account beyond 9x initial scale.`; break;
                                            case 2025: narrative = `By the end of 2025, compounding took over, pushing cumulative returns above 1,100%.`; break;
                                            default: narrative = "Dynamic multi-asset allocation eliminates subjective bias. This is machine learning applied to continuous market rotations.";
                                        }
                                    } else {
                                        switch (year) {
                                            case 2019: narrative = `Starting with just $${(5000 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })}... the engine found 183 mean-reversion opportunities in its first year, growing the account 48%.`; break;
                                            case 2020: narrative = `2020 brought COVID chaos. The engine adapted, staying profitable with +$${(987 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })} while markets panicked.`; break;
                                            case 2021: narrative = `2021 was the breakout — $${(5847 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })} in profit. The account nearly doubled to $${(14236 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })}.`; break;
                                            case 2022: narrative = `Then 2022 hit. TQQQ lost 79%. Our worst year: -35%. But the crash filter protected capital...`; break;
                                            case 2023:
                                            case 2024: narrative = `Those who stayed saw 2023 return +43% and 2024 deliver +45%. Patience was rewarded.`; break;
                                            case 2025: narrative = `By 2025, $${(5000 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })} became $${(21811 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })}. +336% total return. The secret isn't any one trade — it's compounding.`; break;
                                            default: narrative = "Markets overreact. TurboBounce catches the snapback. This is 7 years of real data...";
                                        }
                                    }

                                    return (
                                        <div className="bg-[#100D23]/95 border border-[#334155] p-4 rounded-xl shadow-2xl max-w-xs backdrop-blur-md">
                                            <p className="text-tm-muted text-xs mb-1 font-mono">{label}</p>
                                            <p className="text-white font-mono text-2xl font-bold mb-3 tracking-tight">${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            <p className="text-[#e2e8f0] text-sm leading-relaxed">{narrative}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                            cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={chartColor}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div >
    );
}
