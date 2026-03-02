'use client';

import React, { useState, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function CompoundingCalculator() {
    const { t } = useTranslation();
    const [startingCapital, setStartingCapital] = useState(5000);
    const [monthlyAddition, setMonthlyAddition] = useState(500);
    const [years, setYears] = useState(10);
    const [cagr, setCagr] = useState(48.0); // Default to TB first year actual

    const data = useMemo(() => {
        const result = [];
        let currentPrincipal = startingCapital;
        let currentInterest = 0;

        const monthlyRate = cagr / 100 / 12;

        for (let i = 0; i <= years; i++) {
            result.push({
                year: `Year ${i}`,
                principal: Math.round(currentPrincipal),
                interest: Math.round(currentInterest),
                total: Math.round(currentPrincipal + currentInterest)
            });

            // Compound for 12 months for the next year
            for (let m = 0; m < 12; m++) {
                const interestEarned = (currentPrincipal + currentInterest) * monthlyRate;
                currentInterest += interestEarned;
                currentPrincipal += monthlyAddition;
            }
        }
        return result;
    }, [startingCapital, monthlyAddition, years, cagr]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    const finalTotal = data[data.length - 1].total;
    const finalPrincipal = data[data.length - 1].principal;
    const finalInterest = data[data.length - 1].interest;

    return (
        <div className="w-full flex flex-col lg:flex-row gap-8 glass-card p-6 md:p-8 mt-12 bg-[#0D0B1A]/80 border-t-4 border-tm-purple">
            {/* Controls */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-tm-purple/20 border border-tm-purple flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-tm-purple" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{t('calculator.title')}</h2>
                        <p className="text-tm-muted text-sm">Project your wealth realistically</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm text-tm-muted uppercase tracking-wide font-semibold">{t('calculator.starting_capital')}</label>
                            <span className="font-mono text-white bg-white/5 py-1 px-3 rounded text-sm">{formatCurrency(startingCapital)}</span>
                        </div>
                        <input type="range" min={1000} max={100000} step={1000} value={startingCapital} onChange={e => setStartingCapital(Number(e.target.value))} className="w-full h-1.5 bg-tm-border rounded-lg appearance-none cursor-pointer accent-tm-purple" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm text-tm-muted uppercase tracking-wide font-semibold">{t('calculator.monthly_additions')}</label>
                            <span className="font-mono text-white bg-white/5 py-1 px-3 rounded text-sm">{formatCurrency(monthlyAddition)}</span>
                        </div>
                        <input type="range" min={0} max={10000} step={100} value={monthlyAddition} onChange={e => setMonthlyAddition(Number(e.target.value))} className="w-full h-1.5 bg-tm-border rounded-lg appearance-none cursor-pointer accent-tm-purple" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm text-tm-muted uppercase tracking-wide font-semibold">{t('calculator.time_horizon')}</label>
                            <span className="font-mono text-white bg-white/5 py-1 px-3 rounded text-sm">{years} Years</span>
                        </div>
                        <input type="range" min={1} max={30} step={1} value={years} onChange={e => setYears(Number(e.target.value))} className="w-full h-1.5 bg-tm-border rounded-lg appearance-none cursor-pointer accent-tm-purple" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm text-tm-muted uppercase tracking-wide font-semibold">{t('calculator.cagr')}</label>
                            <span className="font-mono text-tm-green bg-tm-green/10 py-1 px-3 rounded text-sm font-bold">{cagr.toFixed(1)}%</span>
                        </div>
                        <input type="range" min={5} max={100} step={0.5} value={cagr} onChange={e => setCagr(Number(e.target.value))} className="w-full h-1.5 bg-tm-border rounded-lg appearance-none cursor-pointer accent-tm-purple" />

                        <div className="flex gap-2 mt-2">
                            <button onClick={() => setCagr(10.0)} className="flex-1 text-xs py-1.5 bg-white/5 hover:bg-white/10 text-tm-muted rounded transition-colors">S&P 500 (10%)</button>
                            <button onClick={() => setCagr(48.0)} className="flex-1 text-xs py-1.5 bg-tm-purple/20 hover:bg-tm-purple/30 text-tm-purple border border-tm-purple/30 rounded transition-colors font-bold">TB Actual (48%)</button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Chart Area */}
            <div className="w-full lg:w-2/3 flex flex-col">
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-tm-card/40 border border-white/5 p-4 rounded-xl">
                        <p className="text-tm-muted text-xs uppercase tracking-wider mb-1">Total Contributions</p>
                        <p className="text-xl font-mono text-white">{formatCurrency(finalPrincipal)}</p>
                    </div>
                    <div className="bg-tm-card/40 border border-white/5 p-4 rounded-xl">
                        <p className="text-tm-muted text-xs uppercase tracking-wider mb-1">Total Interest</p>
                        <p className="text-xl font-mono text-tm-purple">{formatCurrency(finalInterest)}</p>
                    </div>
                    <div className="bg-tm-purple/10 border border-tm-purple/30 p-4 rounded-xl">
                        <p className="text-tm-purple/70 font-bold text-xs uppercase tracking-wider mb-1">Final Balance</p>
                        <p className="text-2xl font-mono font-bold text-white">{formatCurrency(finalTotal)}</p>
                    </div>
                </div>

                <div className="flex-1 min-h-[300px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#334155" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#334155" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                            <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000)}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#100D23', borderColor: '#334155', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                formatter={(value: any) => [formatCurrency(Number(value)), undefined]}
                            />
                            <Area type="monotone" dataKey="principal" stackId="1" stroke="#475569" fill="url(#colorPrincipal)" name="Principal" />
                            <Area type="monotone" dataKey="interest" stackId="1" stroke="#7C3AED" fill="url(#colorInterest)" name="Interest" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
