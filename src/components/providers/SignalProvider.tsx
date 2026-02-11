'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSignalSocket } from '@/hooks/useSignalSocket';
import { SignalNotification, ConnectionStatus } from '@/components/SignalNotification';

interface Signal {
    id: string;
    symbol: string;
    strategy: string;
    direction?: string;
    strike?: number;
    frontExpiry?: string;
    backExpiry?: string;
    cost: number;
    potentialReturn: number;
    returnPercent?: number;
    winRate?: number;
    riskLevel?: string;
    status: string;
    rationale?: string;
    signalType?: string;
    createdAt?: string;
    receivedAt?: number;  // Timestamp when signal was received (for expiration)
}

// Signals expire after 30 minutes
const SIGNAL_TTL_MS = 30 * 60 * 1000;
const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

interface SignalContextValue {
    isConnected: boolean;
    lastSignal: Signal | null;
    allSignals: Signal[];
    pendingCount: number;
    removeSignal: (id: string) => void;
    updateSignalStatus: (id: string, status: string) => void;
    clearSignals: () => void;
}

const SignalContext = createContext<SignalContextValue>({
    isConnected: false,
    lastSignal: null,
    allSignals: [],
    pendingCount: 0,
    removeSignal: () => { },
    updateSignalStatus: () => { },
    clearSignals: () => { },
});

const CHANNELS = [
    'calendar_spread',
    'diagonal_spread',  // NEW: Diagonal signals
    'diagonal',         // NEW: Alternate channel name
    'iron_condor',
    'vertical',
    'vertical_spread',
    'vertical_spread.buy',
    'vertical_spread.sell',
    'vertical_spread.warning',
    'earnings',
    // Theta Sprint channels
    'theta_puts',
    'theta_entry',
    'theta_exit'
];

export function useSignalContext() {
    return useContext(SignalContext);
}

interface SignalProviderProps {
    children: ReactNode;
}

export function SignalProvider({ children }: SignalProviderProps) {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [notificationSignal, setNotificationSignal] = useState<Signal | null>(null);
    const [allSignals, setAllSignals] = useState<Signal[]>([]);

    // Track client-side mount to prevent hydration mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch existing signals from database on mount
    useEffect(() => {
        if (!isMounted) return;

        const fetchExistingSignals = async () => {
            try {
                console.log('📥 Fetching existing signals from database...');
                const response = await fetch('/api/signals');

                if (response.ok) {
                    const data = await response.json();
                    if (data.signals && Array.isArray(data.signals)) {
                        console.log(`✅ Loaded ${data.signals.length} signals from database`);
                        // Ensure all signals have IDs and receivedAt timestamp
                        const now = Date.now();
                        const signalsWithIds = data.signals
                            .map((s: Signal, i: number) => ({
                                ...s,
                                id: s.id || `db_signal_${Date.now()}_${i}`,
                                receivedAt: s.createdAt ? new Date(s.createdAt).getTime() : now,
                            }))
                            // Filter out signals older than 30 minutes
                            // Signals WITHOUT a createdAt are treated as old and removed
                            .filter((s: Signal) => {
                                if (s.status && s.status !== 'pending') return true; // Keep executed/rejected
                                const age = now - (s.receivedAt || 0);
                                return age < SIGNAL_TTL_MS;
                            });

                        console.log(`✅ Loaded ${signalsWithIds.length} signals from database (filtered expired)`);
                        setAllSignals(prev => {
                            // Merge with any signals we already have from WebSocket
                            const existingIds = new Set(prev.map(s => s.id));
                            const newSignals = signalsWithIds.filter((s: Signal) => !existingIds.has(s.id));
                            return [...prev, ...newSignals];
                        });
                    }
                } else {
                    console.warn('⚠️ Failed to fetch signals:', response.status);
                }
            } catch (error) {
                console.warn('⚠️ Could not fetch existing signals:', error);
                // Non-fatal: WebSocket will still provide new signals
            }
        };

        fetchExistingSignals();
    }, [isMounted]);

    const handleSignal = useCallback((signal: Signal, channel: string) => {
        console.log('🔔 New signal received:', signal.symbol, channel);

        // Ensure signal has an ID and receivedAt timestamp
        const signalWithId: Signal = {
            ...signal,
            id: signal.id || `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: signal.status || 'pending',
            receivedAt: Date.now(),
        };

        // Add signal to the list if not already present
        setAllSignals(prev => {
            const exists = prev.some(s => s.id === signalWithId.id);
            if (exists) {
                // Update existing signal
                return prev.map(s => s.id === signalWithId.id ? { ...s, ...signalWithId } : s);
            }
            // Add new signal at the beginning
            return [signalWithId, ...prev];
        });

        // Show notification
        setNotificationSignal(signalWithId);
    }, []);

    const handleConnect = useCallback(() => {
        console.log('✅ Signal socket connected');
    }, []);

    const handleDisconnect = useCallback(() => {
        console.log('❌ Signal socket disconnected');
    }, []);

    // Only connect WebSocket on client side
    const { isConnected, lastSignal } = useSignalSocket(
        isMounted ? {
            channels: CHANNELS,
            onSignal: handleSignal,
            onConnect: handleConnect,
            onDisconnect: handleDisconnect,
        } : {
            // Don't connect during SSR
            url: undefined,
            channels: [],
        }
    );

    const handleCloseNotification = useCallback(() => {
        setNotificationSignal(null);
    }, []);

    const handleViewSignal = useCallback(() => {
        router.push('/signals');
    }, [router]);

    const removeSignal = useCallback((id: string) => {
        setAllSignals(prev => prev.filter(s => s.id !== id));
    }, []);

    const updateSignalStatus = useCallback((id: string, status: string) => {
        setAllSignals(prev => prev.map(s =>
            s.id === id ? { ...s, status } : s
        ));
    }, []);

    const clearSignals = useCallback(() => {
        setAllSignals([]);
    }, []);

    // Auto-expire signals older than 30 minutes
    useEffect(() => {
        if (!isMounted) return;

        const interval = setInterval(() => {
            const now = Date.now();
            setAllSignals(prev => {
                const before = prev.length;
                const filtered = prev.filter(s => {
                    // Keep non-pending signals (executed/rejected) and fresh pending signals
                    if (s.status !== 'pending') return true;
                    const age = now - (s.receivedAt || 0);
                    return age < SIGNAL_TTL_MS;
                });
                if (filtered.length < before) {
                    console.log(`🧹 Expired ${before - filtered.length} stale signal(s)`);
                }
                return filtered;
            });
        }, EXPIRY_CHECK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [isMounted]);

    // Calculate pending count
    const pendingCount = allSignals.filter(s => s.status === 'pending').length;

    return (
        <SignalContext.Provider value={{
            isConnected,
            lastSignal,
            allSignals,
            pendingCount,
            removeSignal,
            updateSignalStatus,
            clearSignals,
        }}>
            {children}

            {/* Only render client-side components after mount */}
            {isMounted && (
                <>
                    {/* Global notification toast */}
                    <SignalNotification
                        signal={notificationSignal}
                        onClose={handleCloseNotification}
                        onView={handleViewSignal}
                    />

                    {/* Connection status in corner */}
                    <div className="fixed bottom-4 left-4 z-40">
                        <ConnectionStatus isConnected={isConnected} />
                    </div>
                </>
            )}
        </SignalContext.Provider>
    );
}

