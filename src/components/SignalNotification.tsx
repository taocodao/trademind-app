'use client';

import { useEffect, useState } from 'react';
import { X, TrendingUp, Bell } from 'lucide-react';

interface Signal {
    id: string;
    symbol: string;
    strategy: string;
    cost: number;
    potentialReturn: number;
}

interface SignalNotificationProps {
    signal: Signal | null;
    onClose: () => void;
    onView: () => void;
}

export function SignalNotification({ signal, onClose, onView }: SignalNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (signal) {
            setIsVisible(true);
            // Auto-hide after 10 seconds
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300); // Wait for animation
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [signal, onClose]);

    if (!signal || !isVisible) return null;

    return (
        <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}>
            <div className="glass-card p-4 w-80 border border-tm-purple/30 shadow-lg shadow-tm-purple/20">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-tm-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">New Signal</h4>
                            <button
                                onClick={() => {
                                    setIsVisible(false);
                                    setTimeout(onClose, 300);
                                }}
                                className="text-tm-muted hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-tm-muted mt-1">
                            <span className="font-mono font-semibold text-white">{signal.symbol}</span>
                            {' '}• {signal.strategy}
                        </p>
                        <p className="text-sm mt-1">
                            <span className="text-tm-muted">Cost:</span>{' '}
                            <span className="font-mono">${signal.cost}</span>
                            {' → '}
                            <span className="text-tm-green font-mono">+${signal.potentialReturn}</span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        onView();
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="w-full mt-3 py-2 rounded-lg bg-tm-purple/20 text-tm-purple text-sm font-medium hover:bg-tm-purple/30 transition-colors"
                >
                    View Signal
                </button>
            </div>
        </div>
    );
}

interface ConnectionStatusProps {
    isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
    return (
        <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-tm-green' : 'text-tm-red'
            }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-tm-green animate-pulse' : 'bg-tm-red'
                }`} />
            <span>{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
    );
}
