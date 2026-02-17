'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Signal {
    id: string;
    symbol: string;
    strategy: string;
    direction: string;
    strike: number;
    frontExpiry: string;
    backExpiry: string;
    cost: number;
    potentialReturn: number;
    returnPercent: number;
    winRate: number;
    confidence?: number;
    riskLevel: string;
    status: string;
    rationale?: string;
    // Backward compatibility fields
    entry_price?: number;
    capital_required?: number;
    probability_otm?: number;
}

/**
 * Normalize signal data from various backend formats.
 * Backend may send snake_case or camelCase depending on strategy.
 */
function normalizeSignal(raw: Record<string, unknown>): Signal {
    // Extract core values
    const winRate = (raw.winRate || raw.win_rate || raw.confidence || raw.probability_otm) as number || 0;
    const cost = (raw.cost || raw.entry_price || raw.capital_required) as number || 0;

    return {
        id: (raw.id as string) || `signal_${Date.now()}`,
        symbol: (raw.symbol as string) || '',
        strategy: (raw.strategy as string) || '',
        direction: (raw.direction as string) || '',
        strike: (raw.strike as number) || 0,
        frontExpiry: (raw.frontExpiry || raw.front_expiry || raw.expiration) as string || '',
        backExpiry: (raw.backExpiry || raw.back_expiry) as string || '',
        cost: cost,
        potentialReturn: (raw.potentialReturn || raw.potential_return || raw.total_premium || raw.expected_premium) as number || 0,
        returnPercent: (raw.returnPercent || raw.return_percent) as number || 0,
        winRate: winRate,
        confidence: winRate, // Alias for backward compatibility
        riskLevel: (raw.riskLevel || raw.risk_level) as string || 'medium',
        status: (raw.status as string) || 'pending',
        rationale: (raw.rationale || raw.reasoning) as string || '',
        // Alias fields
        entry_price: cost,
        capital_required: cost,
        probability_otm: winRate,
    };
}

interface SignalMessage {
    type: 'signal' | 'account_update' | 'connected' | 'subscribed' | 'pong';
    channel?: string;
    data?: Signal | Record<string, unknown>;
    timestamp?: string;
    message?: string;
    channels?: string[];
}

interface UseSignalSocketOptions {
    url?: string;
    channels?: string[];
    onSignal?: (signal: Signal, channel: string) => void;
    onAccountUpdate?: (data: Record<string, unknown>) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
}


export function useSignalSocket({
    url = process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'ws://34.235.119.67:8003' : 'wss://ws.trademind.bot'),
    channels = ['calendar_spread'],
    onSignal,
    onAccountUpdate,
    onConnect,
    onDisconnect,
}: UseSignalSocketOptions = {}) {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastSignal, setLastSignal] = useState<Signal | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);

    // Refs for callbacks to avoid re-connecting when they change
    const onSignalRef = useRef(onSignal);
    const onAccountUpdateRef = useRef(onAccountUpdate);
    const onConnectRef = useRef(onConnect);
    const onDisconnectRef = useRef(onDisconnect);

    // Update refs on every render
    useEffect(() => {
        onSignalRef.current = onSignal;
        onAccountUpdateRef.current = onAccountUpdate;
        onConnectRef.current = onConnect;
        onDisconnectRef.current = onDisconnect;
    }, [onSignal, onAccountUpdate, onConnect, onDisconnect]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log('🔌 WebSocket connected');
                setIsConnected(true);
                reconnectAttempts.current = 0;
                onConnectRef.current?.();

                // Subscribe to channels
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    channels,
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const message: SignalMessage = JSON.parse(event.data);

                    switch (message.type) {
                        case 'signal':
                            if (message.data && message.channel) {
                                // Handle both wrapped {"signal": {...}} and direct signal data
                                const rawData = message.data as Record<string, unknown>;
                                const innerData = (rawData.signal || rawData) as Record<string, unknown>;
                                const signal = normalizeSignal(innerData);
                                console.log('📥 Signal received:', signal.symbol, signal.strategy);
                                setLastSignal(signal);
                                onSignalRef.current?.(signal, message.channel);
                            }
                            break;

                        case 'account_update':
                            if (message.data) {
                                onAccountUpdateRef.current?.(message.data as Record<string, unknown>);
                            }
                            break;

                        case 'connected':
                            console.log('📡 Server:', message.message);
                            break;

                        case 'subscribed':
                            console.log('✅ Subscribed to:', message.channels);
                            break;
                    }
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                setIsConnected(false);
                onDisconnectRef.current?.();

                // Reconnect with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                reconnectAttempts.current += 1;
                console.log(`Reconnecting in ${delay / 1000}s...`);
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
        }
    }, [url, channels]); // Removed callbacks from dependencies

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            // Prevent reconnection triggers by removing listeners
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.onopen = null;

            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const subscribe = useCallback((newChannels: string[]) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'subscribe',
                channels: newChannels,
            }));
        }
    }, []);

    const unsubscribe = useCallback((channelsToRemove: string[]) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'unsubscribe',
                channels: channelsToRemove,
            }));
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        lastSignal,
        subscribe,
        unsubscribe,
        disconnect,
        reconnect: connect,
    };
}
