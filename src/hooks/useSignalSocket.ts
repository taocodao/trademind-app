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
    riskLevel: string;
    status: string;
    rationale?: string;
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
    url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8003',
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
                onConnect?.();

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
                                const signal = message.data as Signal;
                                setLastSignal(signal);
                                onSignal?.(signal, message.channel);
                            }
                            break;

                        case 'account_update':
                            if (message.data) {
                                onAccountUpdate?.(message.data as Record<string, unknown>);
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
                onDisconnect?.();

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
    }, [url, channels, onSignal, onAccountUpdate, onConnect, onDisconnect]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
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
