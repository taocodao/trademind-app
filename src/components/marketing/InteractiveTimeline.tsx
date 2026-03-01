'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface DataPoint {
    date: string;
    value: number;
}

export function InteractiveTimeline({ data }: { data: DataPoint[] }) {
    const { t } = useLanguage();
    const [isPlaying, setIsPlaying] = useState(false);

    // Instead of a full 3 minutes, let's map the 84 months to a pleasant animation duration, e.g., 30 seconds for the web
    // But the user requested a "3-minute voice narrative". So total duration = 180 seconds.
    const TOTAL_DURATION_SEC = 180;
    const [elapsedTime, setElapsedTime] = useState(0);

    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const reset = () => {
        setIsPlaying(false);
        setElapsedTime(0);
    };

    // Animation Loop
    useEffect(() => {
        const animate = (time: number) => {
            if (lastTimeRef.current !== null) {
                const delta = (time - lastTimeRef.current) / 1000; // in seconds
                setElapsedTime((prev) => {
                    const next = prev + delta;
                    if (next >= TOTAL_DURATION_SEC) {
                        setIsPlaying(false);
                        return TOTAL_DURATION_SEC;
                    }
                    return next;
                });
            }
            lastTimeRef.current = time;
            if (isPlaying) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        if (isPlaying) {
            lastTimeRef.current = performance.now();
            animationRef.current = requestAnimationFrame(animate);
        } else {
            lastTimeRef.current = null;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying]);

    // Calculate how much of the data to show based on elapsed time
    const progressPercentage = Math.min(elapsedTime / TOTAL_DURATION_SEC, 1);
    const dataLength = data && data.length > 0 ? data.length : 1;
    const currentDataIndex = Math.min(
        Math.floor(progressPercentage * dataLength),
        dataLength - 1
    );

    // We slice the data to only draw up to the current progress
    const visibleData = data && data.length > 0 ? data.slice(0, currentDataIndex + 1) : [];

    // Get current Portfolio Value
    const currentPortfolioValue = visibleData.length > 0
        ? visibleData[visibleData.length - 1].value
        : 5000;

    return (
        <div className="w-full flex flex-col gap-6">

            {/* Top Stat Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-card p-6">
                <div>
                    <h2 className="text-tm-muted text-sm font-semibold uppercase tracking-wider">{t('timeline.total')}</h2>
                    <div className="text-4xl font-mono font-bold text-white mt-1">
                        ${currentPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            onClick={togglePlay}
                            className="p-4 rounded-full bg-tm-purple text-white hover:scale-105 transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                        </button>

                        <button className="p-3 rounded-full hover:bg-white/5 text-tm-purple transition-colors relative">
                            <Volume2 className="w-5 h-5" />
                            {isPlaying && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-tm-green animate-ping"></span>
                            )}
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full md:w-64 h-2 bg-tm-border rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-tm-purple to-[#9d63f5]"
                            style={{ width: `${progressPercentage * 100}%` }}
                        ></div>
                    </div>
                    <div className="text-xs text-tm-muted font-mono flex justify-between w-full">
                        <span>{Math.floor(elapsedTime / 60)}:{(Math.floor(elapsedTime % 60)).toString().padStart(2, '0')}</span>
                        <span>3:00</span>
                    </div>
                </div>
            </div>

            {/* Main Interactive Chart */}
            <div className="w-full h-[400px] glass-card p-6 relative">
                {!isPlaying && elapsedTime === 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-tm-bg/50 backdrop-blur-sm rounded-xl">
                        <button onClick={togglePlay} className="flex flex-col items-center gap-4 group">
                            <div className="w-20 h-20 rounded-full bg-tm-purple/20 border border-tm-purple flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-10 h-10 text-tm-purple ml-2" />
                            </div>
                            <span className="text-white font-bold tracking-widest text-sm">LISTEN TO THE DATA</span>
                        </button>
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
                            contentStyle={{ backgroundColor: '#100D23', borderColor: '#334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
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
