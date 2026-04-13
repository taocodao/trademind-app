'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { SignalNotification } from '@/components/SignalNotification';
import { useSettings } from '@/components/providers/SettingsProvider';

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
    userExecution?: {
        status: string;
        orderId: string | null;
        executedAt: string | null;
    };
}

// Signals expire at market close (4:00 PM ET) on the day they were created
const MARKET_CLOSE_HOUR_ET = 16;
const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000;

function isSignalExpired(signal: { expires_at?: string; expiresAt?: string; createdAt?: string; strategy?: string; type?: string }): boolean {
    const expiresAt = signal.expires_at || signal.expiresAt;
    if (expiresAt) {
        const safeStr = expiresAt.replace(' ', 'T');
        return Date.now() > new Date(safeStr).getTime();
    }

    // TurboCore REBALANCE signals represent an ongoing portfolio allocation.
    // They should NOT be expired by the market-close heuristic — only an
    // explicit expires_at from the DB (checked above) should expire them.
    const strat = (signal.strategy || '').toLowerCase();
    const type = (signal.type || '').toLowerCase();
    if (strat.includes('turbocore') || type === 'rebalance') {
        return false;
    }

    // No explicit expiry — infer from creation date.
    // Treat as expired if created before today's market close (4PM ET).
    if (signal.createdAt) {
        const created = new Date(signal.createdAt);
        const nowUtc = new Date();

        // Convert "now" to ET by subtracting offset (ET = UTC-4 in EDT, UTC-5 in EST)
        const etOffset = 4; // Using EDT (summer). Adjust if needed.

        // Market close ET for the creation date
        const createdEt = new Date(created.getTime() - etOffset * 60 * 60 * 1000);
        const marketClose = new Date(createdEt);
        marketClose.setUTCHours(MARKET_CLOSE_HOUR_ET + etOffset, 0, 0, 0); // 4PM ET = 20:00 UTC

        // If now is past market close on the signal's creation day, it's expired
        if (nowUtc > marketClose) {
            return true;
        }
    }

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
    const { settings: localSettings, effectiveAutoApproval } = useSettings();

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
        if (signal.status !== 'pending') return;
        // Only skip if already submitted for execution (not just checked)
        if (processedSignalIds.current.has(signal.id)) return;

        const strategy = (signal.strategy || '').toLowerCase();
        
        let isAutoApprovePermitted = false;
        
        // Check effective value (respects session-only override from dashboard)
        if (effectiveAutoApproval) {
            // If it's turbocore/turbobounce, the global bundle setting is sufficient
            if (strategy.includes('turbocore') || strategy.includes('turbobounce')) {
                isAutoApprovePermitted = true;
            }
        }
        
        // If not enabled globally, check Gamification DB config
        if (!isAutoApprovePermitted && autoSettings?.enabled) {
            let strategyKey: string;
            if (strategy.includes('theta') || strategy.includes('put')) strategyKey = 'theta';
            else if (strategy.includes('zebra')) strategyKey = 'zebra';
            else if (strategy.includes('dvo') || strategy.includes('value')) strategyKey = 'dvo';
            else strategyKey = 'diagonal';
            
            const config = autoSettings[strategyKey] as any;
            if (config?.enabled) {
                isAutoApprovePermitted = true;
            }
        }

        if (!isAutoApprovePermitted) return;

        console.log(`🤖 Auto-approve permitted for ${signal.symbol}. Linking brokerage status...`);

        // Check 0: Account must have buying power (Only if connected to a brokerage)
        // If the user hasn't successfully fetched account data (buyingPower is 0),
        // we assume they are on a signal-only plan or their account is disconnected.
        const isBrokerageLinked = buyingPower > 0 || openPositionCount > 0;

        if (isBrokerageLinked) {
            if (buyingPower <= 0) {
                console.log(`❌ Auto-approve skipped: No buying power available ($${buyingPower.toFixed(2)})`);
                return;
            }

            // Find risk level config if possible
            let riskLevelConfig = 'MEDIUM';
            if (autoSettings?.enabled) {
                let strategyKey = 'diagonal';
                if (strategy.includes('theta') || strategy.includes('put')) strategyKey = 'theta';
                else if (strategy.includes('zebra')) strategyKey = 'zebra';
                else if (strategy.includes('dvo') || strategy.includes('value')) strategyKey = 'dvo';
                
                const c = autoSettings[strategyKey] as any;
                if (c?.riskLevel) riskLevelConfig = c.riskLevel;
            }

            // Check 1: Risk Limits
            const limits = RISK_LIMITS[riskLevelConfig as keyof typeof RISK_LIMITS] || RISK_LIMITS.MEDIUM;
            const confidence = signal.confidence || 0;
            const capitalReq = signal.capital_required || signal.cost || 0;

            // Wait, TurboCore strategy may bypass gamification confidence checks
            if (!strategy.includes('turbocore')) {
                if (confidence < limits.minConfidence) {
                    console.log(`❌ Auto-approve skipped: Confidence ${confidence}% < ${limits.minConfidence}%`);
                    return;
                }

                // Check 2: Capital Requirements
                if (capitalReq > limits.maxCapital) {
                    console.log(`❌ Auto-approve skipped: Capital $${capitalReq} > limit $${limits.maxCapital}`);
                    return;
                }
            }

            if (capitalReq > 0 && capitalReq > buyingPower) {
                console.log(`❌ Auto-approve skipped: Insufficient buying power ($${buyingPower.toFixed(2)} available vs $${capitalReq} needed)`);
                return;
            }

            // Check 3: Position Limits
            if (!strategy.includes('turbocore') && openPositionCount >= limits.maxPositions) {
                console.log(`❌ Auto-approve skipped: Max positions reached (${openPositionCount} >= ${limits.maxPositions})`);
                return;
            }
        } else {
            console.log(`ℹ️ Auto-approve executing virtually: No brokerage linked (Signal-only mode)`);
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
                // Update signal to executed state so TurboCoreSignalCard shows green 'Executed'
                setAllSignals(prev => prev.map(s =>
                    s.id === signal.id
                        ? { ...s, status: 'executed', userExecution: { status: 'executed', orderId: result.orderId || null, executedAt: new Date().toISOString() } }
                        : s
                ));
                // Refresh account data (BP changed)
                fetchAccountData();
            } else {
                if (result.error && String(result.error).toLowerCase().includes('already executed')) {
                    console.log(`ℹ️ Signal ${signal.id} already executed elsewhere. Removing from queue.`);
                    setAllSignals(prev => prev.filter(s => s.id !== signal.id));
                } else {
                    console.error('❌ Auto-approve execution failed:', result.error);
                }
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
    const isFetchingRef = useRef(false);
    const lastFetchIdRef = useRef(0);

    const fetchExistingSignals = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        const fetchId = ++lastFetchIdRef.current;

        try {
            console.log(`[SignalProvider] Fetch #${fetchId} starting...`);
            const response = await fetch('/api/signals');
            if (response.ok) {
                const data = await response.json();

                // Race condition check: Only process if this is still the latest fetch
                if (fetchId !== lastFetchIdRef.current) {
                    console.warn(`[SignalProvider] Fetch #${fetchId} is stale, ignoring.`);
                    return;
                }

                if (data.error) {
                    console.warn(`[SignalProvider] Backend error for #${fetchId}: ${data.error}`);
                    return;
                }

                if (data.signals && Array.isArray(data.signals)) {
                    const now = Date.now();
                    const signalsWithIds = data.signals
                        .map((s: Signal, i: number) => ({
                            ...s,
                            id: s.id || `db_signal_${Date.now()}_${i}`,
                            receivedAt: s.createdAt ? new Date(s.createdAt).getTime() : now,
                        }))
                        .filter((s: Signal) => {
                            const strat = (s.strategy || '').toLowerCase();
                            const type = ((s as any).type || '').toLowerCase();

                            // No longer filtering by strategy here so the multi-strategy 
                            // frontend can handle routing them to the right tab.

                            // Non-pending signals always pass (already executed/rejected)
                            if (s.status && s.status !== 'pending') return true;
                            // If the current user already executed it, don't attempt to process it further
                            if ((s as any).userExecution?.status === 'executed') return true;

                            // Only respect explicit DB-set expiry (isSignalExpired skips market-close
                            // inference for turbocore/rebalance signals)
                            const expired = isSignalExpired(s as any);
                            if (expired) {
                                console.log(`⏰ Expired TurboCore signal ${s.symbol}: expiresAt=${(s as any).expiresAt}`);
                                return false;
                            }
                            return true;
                        });

                    console.log(`[SignalProvider] Fetch #${fetchId} finished with ${signalsWithIds.length} signals out of ${data.signals.length} raw.`);

                    // Critical Update: Use functional update to avoid stale closures
                    _setAllSignals(signalsWithIds);

                    signalsWithIds.forEach((s: Signal) => {
                        if (s.status === 'pending') attemptAutoApprove(s);
                    });
                } else {
                    console.warn(`[SignalProvider] Fetch #${fetchId} returned empty or invalid signals.`, data);
                }
            } else {
                console.warn(`[SignalProvider] Fetch #${fetchId} failed with status ${response.status}`);
            }
        } catch (error) {
            console.error(`[SignalProvider] Fetch #${fetchId} error:`, error);
        } finally {
            if (fetchId === lastFetchIdRef.current) {
                isFetchingRef.current = false;
            }
        }
    }, [isMounted, attemptAutoApprove]); // _setAllSignals is stable

    // SSE Connection for real-time push notifications
    useEffect(() => {
        if (!isMounted) return;
        
        console.log('[SignalProvider] Connecting to SSE stream...');
        const eventSource = new EventSource('/api/signals/stream');
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_signal') {
                    console.log(`[SignalProvider] SSE Real-time signal push received! Strategy: ${data.strategy}`);
                    // Re-fetch from DB when push arrives
                    fetchExistingSignals();
                } else if (data.type === 'connected') {
                    console.log('[SignalProvider] SSE Connected successfully');
                }
            } catch (e) {
                // ignore keep-alives or malformed JSON
            }
        };
        
        eventSource.onerror = (err) => {
            console.warn('[SignalProvider] SSE connection error, will auto-reconnect', err);
        };
        
        return () => {
            console.log('[SignalProvider] Closing SSE stream');
            eventSource.close();
        };
    }, [isMounted, fetchExistingSignals]);

    // Fallback polling (less aggressive now that SSE is active)
    useEffect(() => {
        if (!isMounted) return;
        fetchExistingSignals();

        let timeoutId: NodeJS.Timeout;

        const scheduleNextPoll = () => {
            const et = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
            const etDate = new Date(et);
            const h = etDate.getHours();
            const d = etDate.getDay();

            // Default: Poll every 30 minutes outside market hours to save resources
            let delay = 30 * 60 * 1000;

            if (d >= 1 && d <= 5) {
                if (h === 15) {
                    // During 3:00 PM - 3:59 PM ET
                    // Used to be 30s here, but SSE handles the primary push.
                    // Keep a 1-minute fallback just in case SSE drops exactly at 15:00.
                    delay = 60 * 1000;
                } else if (h >= 9 && h < 16) {
                    // During rest of market hours, poll every 5 minutes
                    delay = 5 * 60 * 1000;
                }
            }

            timeoutId = setTimeout(() => {
                fetchExistingSignals();
                scheduleNextPoll();
            }, delay);
        };

        scheduleNextPoll();

        return () => clearTimeout(timeoutId);
    }, [isMounted, fetchExistingSignals]);

    const handleCloseNotification = useCallback(() => setNotificationSignal(null), []);
    const handleViewSignal = useCallback(() => router.push('/dashboard'), [router]);
    const removeSignal = useCallback((id: string) => {
        _setAllSignals(prev => {
            console.log(`[SignalProvider] removeSignal: Removing signal ${id} from state.`);
            return prev.filter(s => s.id !== id);
        });
    }, []);
    const updateSignalStatus = useCallback((id: string, status: string) => {
        _setAllSignals(prev => {
            console.log(`[SignalProvider] updateSignalStatus: Updating signal ${id} to status ${status}.`);
            return prev.map(s => s.id === id ? { ...s, status } : s);
        });
    }, []);
    const clearSignals = useCallback(() => {
        console.log('[SignalProvider] clearSignals called: Clearing all signals.');
        _setAllSignals([]);
    }, []);

    // Cleanup expired
    useEffect(() => {
        if (!isMounted) return;
        const interval = setInterval(() => {
            _setAllSignals(prev => {
                const filtered = prev.filter(s => {
                    if (s.status !== 'pending') return true;
                    return !isSignalExpired(s as any);
                });
                if (filtered.length !== prev.length) {
                    console.log(`[SignalProvider] Expiry cleanup removed ${prev.length - filtered.length} signals.`);
                }
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

// Helper for filtering
const strats = ['turbobounce', 'diagonal', 'theta', 'test_strategy', 'calendar-spread'];
