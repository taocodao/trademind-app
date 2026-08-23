'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SignalNotification } from '@/components/SignalNotification';
import { useSettings } from '@/components/providers/SettingsProvider';
import { AUTO_APPROVE_ENABLED } from '@/lib/feature-flags';

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
    updateSignalExecution: (id: string, orderId: string | null) => void;
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
    updateSignalExecution: () => { },
    clearSignals: () => { },
    isAutoApproving: false,
});

const CHANNELS = [
    'turbobounce'
];

export function useSignalContext() {
    return useContext(SignalContext);
}

interface SignalProviderProps {
    children: ReactNode;
}

export function SignalProvider({ children }: SignalProviderProps) {
    const router = useRouter();
    const { settings: localSettings } = useSettings();

    const [isMounted, setIsMounted] = useState(false);
    const [notificationSignal, setNotificationSignal] = useState<Signal | null>(null);
    const [allSignalsState, _setAllSignals] = useState<Signal[]>([]);
    const allSignals = allSignalsState;

    const setAllSignals = useCallback((action: React.SetStateAction<Signal[]>) => {
        _setAllSignals(action);
    }, []);

    const [autoSettings, setAutoSettings] = useState<AutoApproveSettings | null>(null);
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

    useEffect(() => {
        setIsMounted(true);
        fetchSettings();
    }, [fetchSettings]);

    const processedSignalIds = useRef(new Set<string>());

    const attemptAutoApprove = useCallback(async (signal: Signal) => {
        if (signal.status !== 'pending') return;
        // Only skip if already submitted for execution (not just checked)
        if (processedSignalIds.current.has(signal.id)) return;
        // Skip if already executed by the current user
        if (signal.userExecution?.status === 'executed') return;

        // Signals-only product model: Auto-Approve is globally disabled.
        // Every signal must be reviewed and entered manually by the user
        // in their own broker — no auto-dispatch to virtual or live execution.
        if (!AUTO_APPROVE_ENABLED) return;

        const strategy = (signal.strategy || '').toLowerCase();
        
        let isAutoApprovePermitted = false;
        
        // Check DB-persisted auto-approve setting (both dashboard and settings page write here)
        if (localSettings?.autoApproval) {
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
            } else {
                if (result.error && String(result.error).toLowerCase().includes('already executed')) {
                    console.log(`ℹ️ Signal ${signal.id} already executed elsewhere. Marking as executed on UI.`);
                    setAllSignals(prev => prev.map(s =>
                        s.id === signal.id
                            ? { ...s, status: 'executed', userExecution: { status: 'executed', orderId: result.orderId || null, executedAt: new Date().toISOString() } }
                            : s
                    ));
                } else {
                    console.error('❌ Auto-approve execution failed:', result.error);
                }
            }
        } catch (err) {
            console.error('❌ Auto-approve error:', err);
        } finally {
            setIsAutoApproving(false);
        }

    }, [autoSettings]);

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
    // Immediately marks a signal as executed (status + userExecution) so the card
    // flips to the green Executed state without waiting for the next DB poll.
    // Used by BOTH auto-approve and manual approval paths for consistency.
    const updateSignalExecution = useCallback((id: string, orderId: string | null) => {
        _setAllSignals(prev => {
            console.log(`[SignalProvider] updateSignalExecution: Marking signal ${id} as executed (orderId=${orderId}).`);
            return prev.map(s => s.id === id
                ? { ...s, status: 'executed', userExecution: { status: 'executed', orderId, executedAt: new Date().toISOString() } }
                : s
            );
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
            updateSignalExecution,
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
