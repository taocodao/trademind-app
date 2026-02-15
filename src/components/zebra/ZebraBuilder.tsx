'use client';

import { useState } from 'react';
import { Loader2, Search, ArrowRight, TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface ZebraBuilderProps {
    onStructuresFound: (structures: any[]) => void;
}

export function ZebraBuilder({ onStructuresFound }: ZebraBuilderProps) {
    const [symbol, setSymbol] = useState('');
    const [direction, setDirection] = useState('LONG');
    const [horizon, setHorizon] = useState(30);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConstruct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symbol) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/zebra/construct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol.toUpperCase(),
                    direction,
                    horizon
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to construct ZEBRA');
            }

            const data = await response.json();
            if (data.structures && data.structures.length > 0) {
                onStructuresFound(data.structures);
            } else {
                setError('No valid ZEBRA structures found for criteria');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-tm-purple" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">ZEBRA Constructor</h2>
                    <p className="text-sm text-tm-muted">Find Zero Extrinsic Back Ratio Spreads</p>
                </div>
            </div>

            <form onSubmit={handleConstruct} className="flex items-end gap-4">
                <div className="flex-1">
                    <label className="block text-xs text-tm-muted mb-2 font-medium">Symbol</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tm-muted" />
                        <input
                            type="text"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            placeholder="SPY"
                            className="w-full bg-tm-surface border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-tm-purple transition-colors font-mono font-bold"
                        />
                    </div>
                </div>

                <div className="w-40">
                    <label className="block text-xs text-tm-muted mb-2 font-medium">Bias</label>
                    <div className="grid grid-cols-2 gap-1 bg-tm-surface p-1 rounded-xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setDirection('LONG')}
                            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-colors ${direction === 'LONG'
                                    ? 'bg-tm-green text-white shadow-lg shadow-green-900/20'
                                    : 'text-tm-muted hover:text-white'
                                }`}
                        >
                            <TrendingUp className="w-3 h-3" /> Long
                        </button>
                        <button
                            type="button"
                            onClick={() => setDirection('SHORT')}
                            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-colors ${direction === 'SHORT'
                                    ? 'bg-tm-red text-white shadow-lg shadow-red-900/20'
                                    : 'text-tm-muted hover:text-white'
                                }`}
                        >
                            <TrendingDown className="w-3 h-3" /> Short
                        </button>
                    </div>
                </div>

                <div className="w-32">
                    <label className="block text-xs text-tm-muted mb-2 font-medium">Horizon (Days)</label>
                    <input
                        type="number"
                        value={horizon}
                        onChange={(e) => setHorizon(parseInt(e.target.value))}
                        className="w-full bg-tm-surface border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tm-purple transition-colors font-mono"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !symbol}
                    className="h-[50px] px-8 bg-gradient-to-r from-tm-purple to-purple-600 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Scan Structures
                </button>
            </form>

            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {error}
                </div>
            )}
        </div>
    );
}
