'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNarration } from './NarrationContext';

interface DataPoint {
    date: string;
    value: number;
    pnl?: number;
}

export function InteractiveTimeline({ data }: { data: DataPoint[] }) {
    const { t } = useTranslation();
    const { isPlaying, progress, currentTime, duration, play, pause, seek, initialInvestment, setInitialInvestment } = useNarration();

    // Scale data to initial investment (base is 5000)
    const multiplier = initialInvestment / 5000.0;

    // Map global progress to data slice
    const reset = () => {
        seek(0);
        if (isPlaying) pause();
    };

    // Calculate how much of the data to show based on elapsed time (context)
    const progressPercentage = progress;
    const dataLength = data && data.length > 0 ? data.length : 1;
    const currentDataIndex = Math.min(
        Math.floor(progressPercentage * dataLength),
        dataLength - 1
    );

    // We scale and slice the data to only draw up to the current progress
    const scaledData = data && data.length > 0 ? data.map(d => ({ ...d, value: d.value * multiplier, pnl: (d.pnl || 0) * multiplier })) : [];
    const visibleData = scaledData.length > 0 ? scaledData.slice(0, currentDataIndex + 1) : [];

    // Get current Portfolio Value
    const currentPortfolioValue = visibleData.length > 0
        ? visibleData[visibleData.length - 1].value
        : 5000;

    return (
        <div className="w-full flex flex-col gap-6">

            {/* Top Stat Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-card p-6">
                <div className="flex items-center gap-8">
                    <div>
                        <h2 className="text-tm-muted text-sm font-semibold uppercase tracking-wider">{t('timeline.total')}</h2>
                        <div className="text-4xl font-mono font-bold text-white mt-1">
                            ${currentPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Interactive Simulator Slider */}
                    <div className="hidden md:flex flex-col gap-1 border-l border-white/10 pl-8">
                        <label className="text-xs text-tm-muted uppercase tracking-wider font-semibold">Simulator Principal</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="1000"
                                max="100000"
                                step="1000"
                                value={initialInvestment}
                                onChange={(e) => setInitialInvestment(Number(e.target.value))}
                                className="w-32 accent-tm-purple cursor-pointer appearance-none bg-tm-border h-1.5 rounded-lg"
                            />
                            <span className="text-white font-mono font-bold text-lg">${initialInvestment.toLocaleString()}</span>
                            {initialInvestment === 5000 && <span className="bg-tm-green/20 text-tm-green px-2 py-0.5 rounded text-[10px] uppercase ml-2">Verified Output</span>}
                        </div>
                    </div>
                </div>
                {/* Playback Controls */}
                <div className="flex flex-col items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={reset}
                            className="p-3 rounded-full hover:bg-white/5 text-tm-muted transition-colors"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>

                        <button
                            onClick={isPlaying ? pause : play}
                            className={`flex items-center gap-2 px-8 py-3 rounded-full text-white font-bold transition-all shadow-lg hover:shadow-xl ${isPlaying ? 'bg-tm-card border border-tm-border' : 'bg-tm-purple border border-transparent hover:bg-tm-purple/90'
                                }`}
                        >{isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                        </button>

                        <button className="p-3 rounded-full hover:bg-white/5 text-tm-purple transition-colors relative">
                            <Volume2 className="w-5 h-5" />
                            {isPlaying && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-tm-green animate-ping"></span>
                            )}
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <input
                        type="range"
                        min={0}
                        max={duration > 0 ? duration : 180}
                        step={0.1}
                        value={currentTime}
                        onChange={(e) => {
                            const newTime = parseFloat(e.target.value);
                            const totalDur = duration > 0 ? duration : 180;
                            seek(newTime / totalDur);
                        }}
                        className="w-full accent-tm-purple cursor-pointer h-1.5 bg-tm-border rounded-lg appearance-none"
                    />
                    <div className="flex justify-between w-full text-xs font-mono text-tm-muted mt-2">
                        <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                        <span>{Math.floor((duration > 0 ? duration : 180) / 60)}:{(Math.floor((duration > 0 ? duration : 180) % 60)).toString().padStart(2, '0')}</span>
                    </div>
                </div>
            </div>

            {/* Main Interactive Chart */}
            <div className="w-full h-[400px] glass-card p-6 relative">
                {!isPlaying && currentTime === 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-tm-bg/50 backdrop-blur-sm rounded-xl">
                        <button onClick={play} className="flex flex-col items-center gap-4 group">
                            <div className="w-20 h-20 rounded-full bg-tm-purple/20 border border-tm-purple flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-10 h-10 text-tm-purple ml-2" />
                            </div>
                            <span className="text-white font-bold tracking-widest text-sm">LISTEN TO THE DATA</span>
                        </button>
                    </div>
                )}

                {progress > 0 && progress < 1.0 && (
                    <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center pointer-events-none">
                        <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-lg border border-white/10 text-white font-mono text-sm max-w-[80%] text-center shadow-xl">
                            {progress < 0.10 ? t('hero.headline') :
                                progress > 0.40 && progress < 0.5 ? t('crash.filter_active') :
                                    "TurboBounce Engine Analyzing..."}
                        </div>
                    </div>
                )}

                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibleData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            stroke="#334155"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="#334155"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(val) => `$${val}`}
                            domain={['dataMin - 1000', 'dataMax + 2000']}
                            hide={true}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const val = payload[0].value;
                                    const year = new Date(label as string | number).getFullYear();
                                    let narrative = "";

                                    switch (year) {
                                        case 2019: narrative = `Starting with just $${initialInvestment.toLocaleString()}... the engine found 183 mean-reversion opportunities in its first year, growing the account 48%.`; break;
                                        case 2020: narrative = `2020 brought COVID chaos. The engine adapted, staying profitable with +$${(987 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })} while markets panicked.`; break;
                                        case 2021: narrative = `2021 was the breakout — $${(5847 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })} in profit. The account nearly doubled to $${(14236 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })}.`; break;
                                        case 2022: narrative = `Then 2022 hit. TQQQ lost 79%. Our worst year: -35%. But the crash filter protected capital.`; break;
                                        case 2023:
                                        case 2024: narrative = `Those who stayed saw 2023 return +43% and 2024 deliver +45%. Patience was rewarded.`; break;
                                        case 2025: narrative = `By 2025, $${initialInvestment.toLocaleString()} became $${(21811 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })}. +336% total return. The secret isn't any one trade — it's compounding.`; break;
                                        default: narrative = "TurboBounce Engine Analyzing...";
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
                            cursor={{ stroke: '#7C3AED', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#7C3AED"
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
