'use client';

import React, { useEffect, useRef } from 'react';
import { useNarration } from '../NarrationContext';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface TradeData {
    symbol: string;
    strategy: string;
    direction: 'BULLISH' | 'BEARISH';
    entryDate: string;
    exitDate: string;
    pnl: number;
    pnlPercent: number;
}

export function SynchronizedTradeFeed({ data }: { data: any[] }) {
    const { progress } = useNarration();
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Only trades that have occurred so far
    const visibleData = data.filter(d => d.progress <= progress && d.trade != null);

    // Auto-scroll to bottom of feed smoothly when new trades are "recorded" into history
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [visibleData.length]);

    if (visibleData.length === 0) {
        return (
            <div className="w-full h-48 lg:h-96 glass-card p-6 flex items-center justify-center border-t-2 border-tm-border/50">
                <span className="text-tm-muted font-mono animate-pulse">Awaiting market opening...</span>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col glass-card border-t-2 border-tm-border/50 overflow-hidden relative">
            <div className="bg-tm-bg/50 backdrop-blur-md p-4 border-b border-tm-border flex items-center justify-between sticky top-0 z-10">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-tm-purple" /> Live Execution Feed
                </h3>
                <span className="text-tm-muted text-sm font-mono">{visibleData.length} TRADES</span>
            </div>

            <div ref={scrollContainerRef} className="h-48 lg:h-96 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide scroll-smooth">
                {visibleData.map((point, i) => {
                    const trade: TradeData = point.trade;
                    const isWin = trade.pnl > 0;

                    return (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-tm-card/60 border border-white/5 rounded-xl gap-4 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isWin ? 'bg-tm-green/10 border border-tm-green/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                                    {trade.direction === 'BULLISH' ? <TrendingUp className={`w-6 h-6 ${isWin ? 'text-tm-green' : 'text-red-500'}`} /> : <TrendingDown className={`w-6 h-6 ${isWin ? 'text-tm-green' : 'text-red-500'}`} />}
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-lg">{trade.symbol}</span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-tm-muted">{trade.strategy.replace('_', ' ')}</span>
                                    </div>
                                    <div className="text-xs text-tm-muted font-mono flex items-center gap-2 mt-1">
                                        <span>{trade.entryDate}</span>
                                        <ArrowRight className="w-3 h-3" />
                                        <span className="text-white/80">{trade.exitDate}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end shrink-0 pl-16 md:pl-0">
                                <span className={`font-mono font-bold text-lg ${isWin ? 'text-tm-green' : 'text-red-500'}`}>
                                    {isWin ? '+' : ''}${trade.pnl.toFixed(2)}
                                </span>
                                <span className={`text-xs font-mono px-2 py-0.5 rounded-full mt-1 ${isWin ? 'bg-tm-green/10 text-tm-green' : 'bg-red-500/10 text-red-500'}`}>
                                    {trade.pnlPercent.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
