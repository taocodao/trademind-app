'use client';

import React, { useState, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface DataPoint {
    year: number;
    contributions: number;
    growth: number;
    total: number;
}

export default function CompoundingCalculator() {
    const [principal, setPrincipal] = useState<number>(5000);
    const [monthlyAddition, setMonthlyAddition] = useState<number>(0);
    const [cagr, setCagr] = useState<number>(20); // 20%
    const [years, setYears] = useState<number>(20);

    const data = useMemo(() => {
        const result: DataPoint[] = [];
        let currentTotal = principal;
        let totalContributions = principal;
        const annualRate = cagr / 100;

        for (let year = 0; year <= years; year++) {
            result.push({
                year,
                contributions: Math.round(totalContributions),
                growth: Math.round(currentTotal - totalContributions),
                total: Math.round(currentTotal)
            });

            // Calculate next year
            currentTotal = currentTotal * (1 + annualRate) + (monthlyAddition * 12);
            totalContributions += (monthlyAddition * 12);
        }
        return result;
    }, [principal, monthlyAddition, cagr, years]);

    const finalTotal = data[data.length - 1].total;

    return (
        <div className="bg-tm-card border border-tm-border rounded-xl p-4 md:p-6 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6">Interactive Compounding Calculator</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Inputs */}
                <div className="col-span-1 space-y-6">
                    <div>
                        <label className="block text-sm text-tm-muted mb-2 font-medium">Starting Capital</label>
                        <input
                            type="range"
                            min="1000"
                            max="100000"
                            step="500"
                            value={principal}
                            onChange={(e) => setPrincipal(Number(e.target.value))}
                            className="w-full accent-tm-purple"
                        />
                        <div className="mt-2 text-white font-mono text-lg">${principal.toLocaleString()}</div>
                    </div>

                    <div>
                        <label className="block text-sm text-tm-muted mb-2 font-medium">Monthly Addition</label>
                        <input
                            type="range"
                            min="0"
                            max="2000"
                            step="25"
                            value={monthlyAddition}
                            onChange={(e) => setMonthlyAddition(Number(e.target.value))}
                            className="w-full accent-tm-purple"
                        />
                        <div className="mt-2 text-white font-mono text-lg">${monthlyAddition.toLocaleString()}</div>
                    </div>

                    <div>
                        <label className="block text-sm text-tm-muted mb-2 font-medium">Expected CAGR (%)</label>
                        <div className="flex gap-2">
                            {[15, 20, 25, 30].map(rate => (
                                <button
                                    key={rate}
                                    onClick={() => setCagr(rate)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${cagr === rate
                                        ? 'bg-tm-purple text-white border border-tm-purple'
                                        : 'bg-transparent border border-tm-border text-tm-muted hover:text-white'
                                        }`}
                                >
                                    {rate}%
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-tm-muted mb-2 font-medium">Time Horizon (Years)</label>
                        <input
                            type="range"
                            min="1"
                            max="30"
                            step="1"
                            value={years}
                            onChange={(e) => setYears(Number(e.target.value))}
                            className="w-full accent-tm-purple"
                        />
                        <div className="mt-2 text-white font-mono text-lg">{years} Years</div>
                    </div>
                </div>

                {/* Output Chart */}
                <div className="col-span-1 md:col-span-2">
                    <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <p className="text-tm-muted text-sm font-medium">Projected Future Value</p>
                            <div className="text-4xl lg:text-5xl font-mono font-bold text-white mt-1">
                                ${finalTotal.toLocaleString()}
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm font-mono text-tm-muted">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500/80"></div>
                                Principal
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-tm-green/80"></div>
                                True Growth
                            </div>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2D2A4A" vertical={false} />
                                <XAxis
                                    dataKey="year"
                                    stroke="#9CA3AF"
                                    tickFormatter={(v) => `Yr ${v}`}
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#9CA3AF"
                                    tickFormatter={(v) => `$${(v / 1000)}k`}
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1A1730', borderColor: '#2D2A4A', borderRadius: '12px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number | undefined, name: string | undefined) => [`$${(value || 0).toLocaleString()}`, name === 'growth' ? 'Compound Growth' : 'Contributions']}
                                    labelFormatter={(label) => `Year ${label}`}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#10B981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorGrowth)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="contributions"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorPrincipal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <p className="text-xs text-tm-muted mt-4 text-center">
                        *Based on historical backtest averages. Past performance does not guarantee future results.
                    </p>
                </div>
            </div>

            {/* Presets */}
            <div className="mt-8 pt-6 border-t border-tm-border flex flex-wrap gap-2 justify-center">
                <button
                    onClick={() => { setPrincipal(1000); setMonthlyAddition(100); setCagr(20); setYears(15); }}
                    className="px-3 py-1.5 rounded bg-tm-bg text-tm-muted hover:text-white text-xs font-mono font-medium border border-transparent hover:border-tm-border transition-all"
                >
                    College Student ($1k)
                </button>
                <button
                    onClick={() => { setPrincipal(5000); setMonthlyAddition(250); setCagr(20); setYears(10); }}
                    className="px-3 py-1.5 rounded bg-tm-bg text-tm-muted hover:text-white text-xs font-mono font-medium border border-transparent hover:border-tm-border transition-all"
                >
                    Side Hustle ($5k)
                </button>
                <button
                    onClick={() => { setPrincipal(25000); setMonthlyAddition(500); setCagr(20); setYears(20); }}
                    className="px-3 py-1.5 rounded bg-tm-bg text-tm-muted hover:text-white text-xs font-mono font-medium border border-transparent hover:border-tm-border transition-all"
                >
                    Serious Investor ($25k)
                </button>
                <button
                    onClick={() => { setPrincipal(5000); setMonthlyAddition(0); setCagr(23.4); setYears(7); }}
                    className="px-3 py-1.5 rounded bg-tm-purple/20 text-tm-purple border border-tm-purple hover:bg-tm-purple/30 text-xs font-mono font-bold transition-all"
                >
                    TB Actual ($5k Track)
                </button>
                <button
                    onClick={() => { setPrincipal(25000); setMonthlyAddition(0); setCagr(24.6); setYears(7); }}
                    className="px-3 py-1.5 rounded bg-tm-purple/20 text-tm-purple border border-tm-purple hover:bg-tm-purple/30 text-xs font-mono font-bold transition-all"
                >
                    TB Actual ($25k Track)
                </button>
            </div>
        </div>
    );
}
