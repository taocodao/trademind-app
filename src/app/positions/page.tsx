"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Clock,
    AlertTriangle,
    TrendingUp,
    XCircle
} from "lucide-react";
import Link from "next/link";

// Mock positions - will be replaced with real WebSocket data
const initialPositions = [
    {
        id: "pos-1",
        symbol: "AAPL",
        type: "Calendar Spread",
        entryPrice: 2.15,
        currentPrice: 3.42,
        unrealizedPnL: 127.50,
        pnlPercent: 59.3,
        stopLoss: -75,
        expiryTime: "2d 14h",
        status: "profit",
    },
    {
        id: "pos-2",
        symbol: "SPY",
        type: "Calendar Spread",
        entryPrice: 1.85,
        currentPrice: 2.23,
        unrealizedPnL: 38.00,
        pnlPercent: 20.5,
        stopLoss: -50,
        expiryTime: "4d 6h",
        status: "profit",
    },
    {
        id: "pos-3",
        symbol: "MSFT",
        type: "Calendar Spread",
        entryPrice: 2.50,
        currentPrice: 2.35,
        unrealizedPnL: -15.00,
        pnlPercent: -6.0,
        stopLoss: -50,
        expiryTime: "1d 2h",
        status: "loss",
    },
];

export default function PositionsPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const [positions, setPositions] = useState(initialPositions);

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    // Simulate real-time updates (would be WebSocket in production)
    useEffect(() => {
        const interval = setInterval(() => {
            setPositions(prev => prev.map(pos => ({
                ...pos,
                currentPrice: pos.currentPrice + (Math.random() - 0.5) * 0.05,
                unrealizedPnL: pos.unrealizedPnL + (Math.random() - 0.5) * 2,
            })));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleClose = (id: string) => {
        // TODO: Call API to close position
        setPositions(positions.filter(p => p.id !== id));
    };

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        );
    }

    const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

    return (
        <main className="min-h-screen pb-6">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Active Positions</h1>
                    <p className="text-sm text-tm-muted">{positions.length} open</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-tm-muted">Total P&L</p>
                    <p className={`font-mono font-bold ${totalPnL >= 0 ? 'profit-glow' : 'loss-glow'}`}>
                        {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                    </p>
                </div>
            </header>

            {/* Live Indicator */}
            <div className="px-6 mb-4">
                <div className="flex items-center gap-2 text-sm text-tm-muted">
                    <span className="w-2 h-2 rounded-full bg-tm-green animate-pulse" />
                    Live - Updates every 5s
                </div>
            </div>

            {/* Positions List */}
            <div className="px-6 space-y-4">
                {positions.map((position) => (
                    <PositionCard
                        key={position.id}
                        position={position}
                        onClose={() => handleClose(position.id)}
                    />
                ))}

                {positions.length === 0 && (
                    <div className="glass-card p-8 text-center">
                        <TrendingUp className="w-12 h-12 text-tm-purple mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No open positions</h3>
                        <p className="text-sm text-tm-muted mb-4">Check signals for new opportunities</p>
                        <Link href="/signals" className="btn-primary inline-block">
                            View Signals
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}

interface Position {
    id: string;
    symbol: string;
    type: string;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    pnlPercent: number;
    stopLoss: number;
    expiryTime: string;
    status: string;
}

function PositionCard({
    position,
    onClose,
}: {
    position: Position;
    onClose: () => void;
}) {
    const isProfit = position.unrealizedPnL >= 0;
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="glass-card p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isProfit ? "bg-tm-green/20" : "bg-tm-red/20"
                        }`}>
                        <span className="font-bold text-lg">{position.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{position.symbol}</h3>
                        <p className="text-sm text-tm-muted">{position.type}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-tm-surface px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-tm-green animate-pulse" />
                    <span className="text-xs font-medium">LIVE</span>
                </div>
            </div>

            {/* Large P&L Display */}
            <div className="text-center py-4 mb-4">
                <p className="text-sm text-tm-muted mb-1">Unrealized P&L</p>
                <p className={`text-4xl font-mono font-bold ${isProfit ? 'profit-glow' : 'loss-glow'}`}>
                    {isProfit ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                </p>
                <p className={`text-lg ${isProfit ? 'text-tm-green' : 'text-tm-red'}`}>
                    {isProfit ? '+' : ''}{position.pnlPercent.toFixed(1)}%
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-white/10">
                <div>
                    <p className="text-xs text-tm-muted">Entry</p>
                    <p className="font-mono font-semibold">${position.entryPrice.toFixed(2)}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-tm-muted">Current</p>
                    <p className={`font-mono font-semibold ${isProfit ? 'text-tm-green' : 'text-tm-red'}`}>
                        ${position.currentPrice.toFixed(2)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-tm-muted">Expiry</p>
                    <p className="font-semibold flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {position.expiryTime}
                    </p>
                </div>
            </div>

            {/* Stop Loss Warning */}
            <div className="flex items-center gap-2 mb-4 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-tm-muted">Auto stop-loss at</span>
                <span className="text-tm-red font-mono">${position.stopLoss}</span>
            </div>

            {/* Close Button */}
            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-3 rounded-xl border border-tm-red/50 text-tm-red hover:bg-tm-red/10 transition-colors font-semibold flex items-center justify-center gap-2"
                >
                    <XCircle className="w-4 h-4" />
                    Close Position
                </button>
            ) : (
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 py-3 rounded-xl border border-white/20 text-tm-muted"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-tm-red hover:bg-red-700 transition-colors font-semibold"
                    >
                        Confirm Close
                    </button>
                </div>
            )}
        </div>
    );
}
