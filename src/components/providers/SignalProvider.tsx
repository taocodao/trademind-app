'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSignalSocket } from '@/hooks/useSignalSocket';
import { SignalNotification, ConnectionStatus } from '@/components/SignalNotification';

interface Signal {
    id: string;
    symbol: string;
    strategy: string;
    cost: number;
    potentialReturn: number;
}

interface SignalContextValue {
    isConnected: boolean;
    lastSignal: Signal | null;
    pendingCount: number;
}

const SignalContext = createContext<SignalContextValue>({
    isConnected: false,
    lastSignal: null,
    pendingCount: 0,
});

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
    const [pendingCount, setPendingCount] = useState(0);

    // Track client-side mount to prevent hydration mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleSignal = useCallback((signal: Signal, channel: string) => {
        console.log('🔔 New signal received:', signal.symbol, channel);
        setNotificationSignal(signal);
        setPendingCount(prev => prev + 1);
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
            channels: ['calendar_spread', 'iron_condor', 'vertical'],
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

    return (
        <SignalContext.Provider value={{ isConnected, lastSignal, pendingCount }}>
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

