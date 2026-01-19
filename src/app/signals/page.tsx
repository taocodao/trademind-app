"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    XCircle
} from "lucide-react";
import Link from "next/link";

// Mock signals - will be replaced with real API
const mockSignals = [
    {
        id: "sig-1",
        symbol: "SPY",
        type: "Calendar Spread",
        direction: "bullish",
        cost: 150,
        potentialReturn: 45,
        returnPercent: 30,
        winRate: 73,
        riskLevel: "Medium",
        expiry: "Jan 24",
        status: "pending",
    },
    {
        id: "sig-2",
        symbol: "AAPL",
        type: "Calendar Spread",
        direction: "bullish",
        cost: 225,
        potentialReturn: 68,
        returnPercent: 30,
        winRate: 76,
        riskLevel: "Low",
        expiry: "Jan 31",
        status: "pending",
    },
    {
        id: "sig-3",
        symbol: "MSFT",
        type: "Calendar Spread",
        direction: "bearish",
        cost: 180,
        potentialReturn: 54,
        returnPercent: 30,
        winRate: 71,
        riskLevel: "Medium",
        expiry: "Jan 24",
        status: "pending",
    },
];

export default function SignalsPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const [signals, setSignals] = useState(mockSignals);

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    const handleApprove = (id: string) => {
        setSignals(signals.map(s =>
            s.id === id ? { ...s, status: "approved" } : s
        ));
        // TODO: Execute trade via API
        router.push(`/positions`);
    };

    const handleSkip = (id: string) => {
        setSignals(signals.filter(s => s.id !== id));
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

    return (
        <main className="min-h-screen pb-6">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold">Trade Signals</h1>
                    <p className="text-sm text-tm-muted">{signals.length} pending</p>
                </div>
            </header>

            {/* Signals List */}
            <div className="px-6 space-y-4">
                {signals.map((signal) => (
                    <SignalCard
                        key={signal.id}
                        signal={signal}
                        onApprove={() => handleApprove(signal.id)}
                        onSkip={() => handleSkip(signal.id)}
                    />
                ))}

                {signals.length === 0 && (
                    <div className="glass-card p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-tm-green mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">All caught up!</h3>
                        <p className="text-sm text-tm-muted">No pending signals</p>
                    </div>
                )}
            </div>
        </main>
    );
}

interface Signal {
    id: string;
    symbol: string;
    type: string;
    direction: string;
    cost: number;
    potentialReturn: number;
    returnPercent: number;
    winRate: number;
    riskLevel: string;
    expiry: string;
    status: string;
}

function SignalCard({
    signal,
    onApprove,
    onSkip,
}: {
    signal: Signal;
    onApprove: () => void;
    onSkip: () => void;
}) {
    const riskColors: { [key: string]: string } = {
        Low: "text-tm-green bg-tm-green/20",
        Medium: "text-yellow-400 bg-yellow-400/20",
        High: "text-tm-red bg-tm-red/20",
    };

    return (
        <div className="glass-card p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${signal.direction === "bullish" ? "bg-tm-green/20" : "bg-tm-red/20"
                        }`}>
                        {signal.direction === "bullish" ? (
                            <TrendingUp className={`w-5 h-5 text-tm-green`} />
                        ) : (
                            <TrendingDown className={`w-5 h-5 text-tm-red`} />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{signal.symbol}</h3>
                        <p className="text-sm text-tm-muted">{signal.type}</p>
                    </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${riskColors[signal.riskLevel]}`}>
                    {signal.riskLevel}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-sm text-tm-muted">Cost</p>
                    <p className="font-mono font-bold text-xl">${signal.cost}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-tm-muted">Potential Return</p>
                    <p className="font-mono font-bold text-xl text-tm-green">
                        +${signal.potentialReturn}
                        <span className="text-sm ml-1">({signal.returnPercent}%)</span>
                    </p>
                </div>
            </div>

            {/* Win Rate & Expiry */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    {/* Win Rate Circle */}
                    <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 transform -rotate-90">
                            <circle
                                className="text-tm-surface"
                                strokeWidth="3"
                                stroke="currentColor"
                                fill="transparent"
                                r="20"
                                cx="24"
                                cy="24"
                            />
                            <circle
                                className="text-tm-green"
                                strokeWidth="3"
                                strokeDasharray={`${signal.winRate * 1.26} 126`}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="20"
                                cx="24"
                                cy="24"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                            {signal.winRate}%
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-tm-muted">Win Rate</p>
                        <p className="font-semibold">Historical</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-tm-muted">Expiry</p>
                    <p className="font-semibold">{signal.expiry}</p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onSkip}
                    className="flex-1 py-3 rounded-xl border border-white/20 text-tm-muted hover:bg-tm-surface transition-colors flex items-center justify-center gap-2"
                >
                    <XCircle className="w-4 h-4" />
                    Skip
                </button>
                <button
                    onClick={onApprove}
                    className="flex-1 py-3 rounded-xl bg-tm-purple hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                </button>
            </div>
        </div>
    );
}
