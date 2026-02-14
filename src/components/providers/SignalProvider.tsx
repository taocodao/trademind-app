'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSignalSocket } from '@/hooks/useSignalSocket';
import { SignalNotification, ConnectionStatus } from '@/components/SignalNotification';

// Types from DB schema
interface AutoApproveSettings {
    enabled: boolean;
    theta: {
        enabled: boolean;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
        customOverrides: Record<string, number>;
    };
    diagonal: {
        enabled: boolean;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
        customOverrides: Record<string, number>;
    };
}

interface Signal {
    id: string;
    symbol: string;
    strategy: string;
    direction?: string;
    strike?: number;
    expiration?: string;
    expiry?: string;
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
    receivedAt?: number;
    contracts?: number;
    entry_price?: number;
    dte?: number;
    confidence?: number;
    capital_required?: number;
}

// Signals expire at market close (4:00 PM ET) on the day they were created
const MARKET_CLOSE_HOUR_ET = 16;
const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000;

function getMarketCloseTime(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const marketClose = new Date(year, month, day, MARKET_CLOSE_HOUR_ET, 0, 0, 0);
    const etOffset = 5 * 60 * 60 * 1000;
    const localOffset = marketClose.getTimezoneOffset() * 60 * 1000;
    return marketClose.getTime() - localOffset - etOffset;
}

function isSignalExpired(createdAt: string | number | undefined): boolean {
    if (!createdAt) return true;
    const createdTime = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt;
    const createdDate = new Date(createdTime);
    const marketClose = getMarketCloseTime(createdDate);
    const now = Date.now();
    return now > marketClose;
}

interface SignalContextValue {
    isConnected: boolean;
    lastSignal: Signal | null;
    allSignals: Signal[];
    pendingCount: number;
    removeSignal: (id: string) => void;
    updateSignalStatus: (id: string, status: string) => void;
    clearSignals: () => void;
    isAutoApproving: boolean;
}

const SignalContext = createContext<SignalContextValue>({
    isConnected: false,
    lastSignal: null,
    allSignals: [],
    pendingCount: 0,
    removeSignal: () => { },
    updateSignalStatus: () => { },
    clearSignals: () => { },
    isAutoApproving: false,
});

const CHANNELS = [
    'calendar_spread',
    'diagonal_spread',
    'diagonal',
    'iron_condor',
    'vertical',
    'vertical_spread',
    'earnings',
    'theta_puts',
    'theta_entry',
    'theta_exit'
];

// Risk Limits (Hardcoded safeguards for auto-approve)
const RISK_LIMITS = {
    LOW: { maxCapital: 1000, minConfidence: 80, maxPositions: 3 },
    MEDIUM: { maxCapital: 2500, minConfidence: 75, maxPositions: 5 },
    HIGH: { maxCapital: 5000, minConfidence: 70, maxPositions: 10 },
};

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
    const [autoSettings, setAutoSettings] = useState<AutoApproveSettings | null>(null);
    const [buyingPower, setBuyingPower] = useState<number>(0);
    const [openPositionCount, setOpenPositionCount] = useState<number>(0);
    const [isAutoApproving, setIsAutoApproving] = useState(false);

    // Track client-side mount
    useEffect(() => {
        setIsMounted(true);
        fetchSettings();
        fetchAccountData();
    }, []);

    // Refresh account data and settings periodically
    useEffect(() => {
        if (!isMounted) return;
        const interval = setInterval(() => {
            fetchAccountData();
            fetchSettings();
        }, 60000); // Every minute
        return () => clearInterval(interval);
    }, [isMounted]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/auto-approve');
            if (res.ok) {
                const data = await res.json();
                setAutoSettings(data);
                console.log('⚙️ Auto-approve settings loaded:', data);
            }
        } catch (e) {
            console.error('Failed to load auto-approve settings', e);
        }
    };

    const fetchAccountData = async () => {
        try {
            // Get Balance
            const balanceRes = await fetch('/api/tastytrade/account');
            if (balanceRes.ok) {
                const data = await balanceRes.json();
                const account = data.data?.items?.[0];
                if (account) {
                    setBuyingPower(parseFloat(account['buying-power'] || '0'));
                }
            }

            // Get Open Positions Count
            const posRes = await fetch('/api/positions?status=open');
            if (posRes.ok) {
                const data = await posRes.json();
                setOpenPositionCount(data.positions?.length || 0);
            }
        } catch (e) {
            console.warn('Failed to fetch account data for auto-approve checks', e);
        }
    };

    const processedSignalIds = useRef(new Set<string>());

    const attemptAutoApprove = useCallback(async (signal: Signal) => {
        if (!autoSettings?.enabled) return;
        if (signal.status !== 'pending') return;
        if (processedSignalIds.current.has(signal.id)) return;

        processedSignalIds.current.add(signal.id);

        // Determine strategy configuration
        const strategyKey = signal.strategy === 'theta' ? 'theta' : 'diagonal';
        const config = autoSettings[strategyKey];

        if (!config?.enabled) return;

        console.log(`🤖 Checking auto-approve for ${signal.symbol} (${strategyKey})...`);

        // Check 1: Risk Limits
        const limits = RISK_LIMITS[config.riskLevel] || RISK_LIMITS.MEDIUM;
        const confidence = signal.confidence || 0;
        const capitalReq = signal.capital_required || signal.cost || 0;

        if (confidence < limits.minConfidence) {
            console.log(`❌ Auto-approve skipped: Confidence ${confidence}% < ${limits.minConfidence}%`);
            return;
        }

        // Check 2: Capital Requirements
        if (capitalReq > limits.maxCapital) {
            console.log(`❌ Auto-approve skipped: Capital $${capitalReq} > limit $${limits.maxCapital}`);
            return;
        }

        if (capitalReq > buyingPower) {
            console.log(`❌ Auto-approve skipped: Insufficient buying power ($${buyingPower} available vs $${capitalReq} needed)`);
            return;
        }

        // Check 3: Position Limits
        if (openPositionCount >= limits.maxPositions) {
            console.log(`❌ Auto-approve skipped: Max positions reached (${openPositionCount} >= ${limits.maxPositions})`);
            return;
        }

        // ✅ All checks passed - execute!
        try {
            console.log(`⚡ Auto-approving signal ${signal.id}...`);
            setIsAutoApproving(true);

            // Optimistic update to UI
            setNotificationSignal({ ...signal, status: 'executing' });

            const response = await fetch(`/api/signals/${signal.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    execute: true,
                    signal: signal,
                    source: 'auto_approve' // Tag execution source
                }),
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`✅ Auto-approved successfully: Order ${result.orderId}`);
                // Update local list
                setAllSignals(prev => prev.filter(s => s.id !== signal.id));
                // Refresh account data (BP changed)
                fetchAccountData();
            } else {
                console.error('❌ Auto-approve execution failed:', result.error);
            }
        } catch (err) {
            console.error('❌ Auto-approve error:', err);
        } finally {
            setIsAutoApproving(false);
        }

    }, [autoSettings, buyingPower, openPositionCount]);

    const handleSignal = useCallback((signal: Signal, channel: string) => {
        console.log('🔔 New signal received:', signal.symbol, channel);

        const signalWithId: Signal = {
            ...signal,
            id: signal.id || `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: signal.status || 'pending',
            receivedAt: Date.now(),
        };

        setAllSignals(prev => {
            const exists = prev.some(s => s.id === signalWithId.id);
            if (exists) return prev.map(s => s.id === signalWithId.id ? { ...s, ...signalWithId } : s);
            return [signalWithId, ...prev];
        });

        // Try auto-approve
        attemptAutoApprove(signalWithId);

        if (!isAutoApproving) {
            setNotificationSignal(signalWithId);
        }
    }, [attemptAutoApprove, isAutoApproving]);

    // Initial fetch of existing signals
    useEffect(() => {
        if (!isMounted) return;
        const fetchExistingSignals = async () => {
            try {
                const response = await fetch('/api/signals');
                if (response.ok) {
                    const data = await response.json();
                    if (data.signals && Array.isArray(data.signals)) {
                        const now = Date.now();
                        const signalsWithIds = data.signals
                            .map((s: Signal, i: number) => ({
                                ...s,
                                id: s.id || `db_signal_${Date.now()}_${i}`,
                                receivedAt: s.createdAt ? new Date(s.createdAt).getTime() : now,
                            }))
                            .filter((s: Signal) => {
                                if (s.status && s.status !== 'pending') return true;
                                return !isSignalExpired(s.createdAt || s.receivedAt);
                            });
                        setAllSignals(prev => {
                            const existingIds = new Set(prev.map(s => s.id));
                            const newSignals = signalsWithIds.filter((s: Signal) => !existingIds.has(s.id));
                            return [...prev, ...newSignals];
                        });
                    }
                }
            } catch (error) {
                console.warn('Could not fetch signals', error);
            }
        };
        fetchExistingSignals();
    }, [isMounted]);

    // Socket connection
    const handleConnect = useCallback(() => console.log('✅ Signal socket connected'), []);
    const handleDisconnect = useCallback(() => console.log('❌ Signal socket disconnected'), []);

    const { isConnected, lastSignal } = useSignalSocket({
        channels: ['theta_entry', 'theta_puts', 'calendar_spread', 'diagonal_spread'],
        onSignal: handleSignal,
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        onAccountUpdate: fetchAccountData
    });

    const handleCloseNotification = useCallback(() => setNotificationSignal(null), []);
    const handleViewSignal = useCallback(() => router.push('/signals'), [router]);
    const removeSignal = useCallback((id: string) => setAllSignals(prev => prev.filter(s => s.id !== id)), []);
    const updateSignalStatus = useCallback((id: string, status: string) => setAllSignals(prev => prev.map(s => s.id === id ? { ...s, status } : s)), []);
    const clearSignals = useCallback(() => setAllSignals([]), []);

    // Cleanup expired
    useEffect(() => {
        if (!isMounted) return;
        const interval = setInterval(() => {
            setAllSignals(prev => prev.filter(s => {
                if (s.status !== 'pending') return true;
                return !isSignalExpired(s.createdAt || s.receivedAt);
            }));
        }, EXPIRY_CHECK_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [isMounted]);

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
            isAutoApproving
        }}>
            {children}
            {isMounted && (
                <>
                    <SignalNotification
                        signal={notificationSignal}
                        onClose={handleCloseNotification}
                        onView={handleViewSignal}
                    />
                    <div className="fixed bottom-4 left-4 z-40">
                        <ConnectionStatus isConnected={isConnected} />
                    </div>
                </>
            )}
        </SignalContext.Provider>
    );
}
