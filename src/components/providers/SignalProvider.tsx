'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { SignalNotification } from '@/components/SignalNotification';

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
        // Strip microseconds (Python sends 6 digits, JS wants 3 or 0) and ensure UTC
        const cleanExp = expiresAt.split('.')[0];
        const expStr = cleanExp.endsWith('Z') || cleanExp.includes('+') ? cleanExp : cleanExp + 'Z';
        const safeExpStr = expStr.replace(' ', 'T');
        return Date.now() > new Date(safeExpStr).getTime();
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
    'turbobounce'
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
    const { authenticated } = usePrivy();
    const [isMounted, setIsMounted] = useState(false);
    const [notificationSignal, setNotificationSignal] = useState<Signal | null>(null);
    const [allSignalsState, _setAllSignals] = useState<Signal[]>([]);
    const allSignals = allSignalsState;

    const setAllSignals = useCallback((action: React.SetStateAction<Signal[]>) => {
        _setAllSignals(action);
    }, []);

    const [autoSettings, setAutoSettings] = useState<AutoApproveSettings | null>(null);
    const [buyingPower, setBuyingPower] = useState<number>(0);
    const [openPositionCount, setOpenPositionCount] = useState<number>(0);
    const [isAutoApproving, setIsAutoApproving] = useState(false);
    const prevBuyingPower = useRef<number>(0);

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
            // Use Vercel OAuth endpoints (matches dashboard logic)
            const acctRes = await fetch('/api/tastytrade/account');
            if (acctRes.ok) {
                const acctJson = await acctRes.json();
                const accountNumber = acctJson?.data?.items?.[0]?.account?.['account-number'];
                if (accountNumber) {
                    const balanceRes = await fetch(`/api/tastytrade/balance?accountNumber=${accountNumber}`);
                    if (balanceRes.ok) {
                        const data = await balanceRes.json();
                        const bp = parseFloat(data.buyingPower || '0');
                        setBuyingPower(bp);
                        setOpenPositionCount(data.positionCount || 0);
                        console.log(`💰 Account data: BP=$${bp.toFixed(2)}`);
                        return;
                    }
                }
            }
            console.warn('Failed to fetch account data from Vercel endpoints');
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
        // Only skip if already submitted for execution (not just checked)
        if (processedSignalIds.current.has(signal.id)) return;

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

        // ✅ All checks passed — mark as processed and execute
        try {
            processedSignalIds.current.add(signal.id);
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

    // We removed the WS connection, so isConnected is now technically always true 
    // for compatibility with downstream components that might check it, 
    // or we can just default it to true since polling is doing the work.
    const isConnected = true;
    const lastSignal = null; // Unused in polling model

    // Polling fetch of signals
    useEffect(() => {
        if (!isMounted || !authenticated) return;

        let isFetching = false;

        const fetchExistingSignals = async () => {
            if (isFetching) return;
            isFetching = true;
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
                                if (s.strategy?.toLowerCase() !== 'turbobounce') return false;
                                if (s.status && s.status !== 'pending') return true;
                                return !isSignalExpired(s as any);
                            });

                        // DB is truth - replace state
                        setAllSignals(signalsWithIds);

                        // Note: Auto-approve logic handles its own processed tracking via `processedSignalIds` ref,
                        // so replacing the array won't cause double-executions. We trigger attemptAutoApprove
                        // for any pending signals in the new batch.
                        signalsWithIds.forEach((s: Signal) => {
                            if (s.status === 'pending') attemptAutoApprove(s);
                        });
                    }
                }
            } catch (error) {
                console.warn('Could not fetch signals', error);
            } finally {
                isFetching = false;
            }
        };

        // Initial fetch
        fetchExistingSignals();

        const isMarketHours = () => {
            const et = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
            const etDate = new Date(et);
            const h = etDate.getHours();
            const d = etDate.getDay();
            // Weekdays 9:30 AM (9) to 4:00 PM (15:59) ET
            return d >= 1 && d <= 5 && h >= 9 && h < 16;
        };

        // Poll every 10s during market hours, 60s otherwise
        const pollInterval = isMarketHours() ? 10_000 : 60_000;
        const interval = setInterval(fetchExistingSignals, pollInterval);
        return () => clearInterval(interval);
    }, [isMounted, authenticated, attemptAutoApprove, setAllSignals]);

    const handleCloseNotification = useCallback(() => setNotificationSignal(null), []);
    const handleViewSignal = useCallback(() => router.push('/dashboard'), [router]);
    const removeSignal = useCallback((id: string) => setAllSignals(prev => prev.filter(s => s.id !== id)), []);
    const updateSignalStatus = useCallback((id: string, status: string) => setAllSignals(prev => prev.map(s => s.id === id ? { ...s, status } : s)), []);
    const clearSignals = useCallback(() => setAllSignals([]), []);

    // Cleanup expired
    useEffect(() => {
        if (!isMounted) return;
        const interval = setInterval(() => {
            setAllSignals(prev => {
                const filtered = prev.filter(s => {
                    if (s.status !== 'pending') return true;
                    return !isSignalExpired(s as any);
                });
                return filtered;
            });
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
                </>
            )}
        </SignalContext.Provider>
    );
}
