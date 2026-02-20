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
    zebra?: {
        enabled: boolean;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
        customOverrides: Record<string, number>;
    };
    dvo?: {
        enabled: boolean;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
        customOverrides: Record<string, number>;
    };
    [key: string]: unknown;
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

function isSignalExpired(signal: { expires_at?: string; expiresAt?: string; createdAt?: string }): boolean {
    const expiresAt = signal.expires_at || signal.expiresAt;
    if (expiresAt) {
        // Treat as UTC if no timezone indicator
        const expStr = expiresAt.endsWith('Z') || expiresAt.includes('+') ? expiresAt : expiresAt + 'Z';
        return Date.now() > new Date(expStr).getTime();
    }
    // Fallback if no expires_at exists
    return false;
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
    'theta_exit',
    'zebra',
    'zebra_entry'
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
    const fetchSettings = useCallback(async () => {
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
    }, []);

    const fetchAccountData = useCallback(async () => {
        try {
            // Use Python backend which returns actual buying power from Tastytrade SDK
            const balanceRes = await fetch('/api/account');
            if (balanceRes.ok) {
                const data = await balanceRes.json();
                const bp = parseFloat(data.buyingPower || data.buying_power || '0');
                setBuyingPower(bp);
                setOpenPositionCount(data.positionCount || data.positions?.length || 0);
                console.log(`💰 Account data: BP=$${bp.toFixed(2)}, Positions=${data.positionCount || 0}`);
            } else {
                console.warn('Failed to fetch account data:', balanceRes.status);
            }
        } catch (e) {
            console.warn('Failed to fetch account data for auto-approve checks', e);
        }

    }, []);

    useEffect(() => {
        setIsMounted(true);
        fetchSettings();
        fetchAccountData();
    }, [fetchSettings, fetchAccountData]);

    const processedSignalIds = useRef(new Set<string>());

    const attemptAutoApprove = useCallback(async (signal: Signal) => {
        if (!autoSettings?.enabled) return;
        if (signal.status !== 'pending') return;
        if (processedSignalIds.current.has(signal.id)) return;

        processedSignalIds.current.add(signal.id);

        // Determine strategy configuration
        const strategy = (signal.strategy || '').toLowerCase();
        let strategyKey: string;
        if (strategy.includes('theta') || strategy.includes('put')) {
            strategyKey = 'theta';
        } else if (strategy.includes('zebra')) {
            strategyKey = 'zebra';
        } else if (strategy.includes('dvo') || strategy.includes('value')) {
            strategyKey = 'dvo';
        } else {
            strategyKey = 'diagonal';
        }

        // Cast to ensure TS knows the shape of the config object
        const config = autoSettings[strategyKey] as {
            enabled: boolean;
            riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
            customOverrides: Record<string, number>;
        } | undefined;

        if (!config?.enabled) return;

        console.log(`🤖 Checking auto-approve for ${signal.symbol} (${strategyKey})...`);

        // Check 0: Account must have buying power
        if (buyingPower <= 0) {
            console.log(`❌ Auto-approve skipped: No buying power available ($${buyingPower.toFixed(2)})`);
            return;
        }

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

        if (capitalReq > 0 && capitalReq > buyingPower) {
            console.log(`❌ Auto-approve skipped: Insufficient buying power ($${buyingPower.toFixed(2)} available vs $${capitalReq} needed)`);
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
                                return !isSignalExpired(s as any);
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

    // Stable channel configuration
    const CHANNEL_SUBSCRIPTIONS = useRef([
        'theta_entry', 'theta_puts', 'theta_exit',
        'calendar_spread', 'diagonal_spread',
        'zebra', 'zebra_entry',
        'dvo_entry', 'dvo_exit'
    ]).current;

    const { isConnected, lastSignal } = useSignalSocket({
        channels: CHANNEL_SUBSCRIPTIONS,
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
                return !isSignalExpired(s as any);
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
