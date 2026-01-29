'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSignalSocket } from './useSignalSocket';
import { Signal } from '@/types/signals';

interface UseSignalsOptions {
    strategies?: string[];  // ['theta', 'calendar']
    autoArchive?: boolean;  // Auto-archive expired signals
}

export function useSignals(options: UseSignalsOptions = {}) {
    const { strategies = ['theta', 'calendar'], autoArchive = true } = options;

    const [signals, setSignals] = useState<Signal[]>([]);
    const [archived, setArchived] = useState<Signal[]>([]);

    // Map strategies to WebSocket channels
    const channels = strategies.flatMap(s => [`${s}_entry`, `${s}_exit`]);

    // Handle incoming signals
    const handleSignal = useCallback((signal: any, channel: string) => {
        // Only add entry signals
        if (channel.includes('_entry')) {
            setSignals(prev => {
                // Avoid duplicates
                if (prev.some(s => s.id === signal.id)) return prev;
                return [signal as Signal, ...prev];
            });
        }
    }, []);

    // Subscribe to WebSocket
    const { isConnected } = useSignalSocket({
        channels,
        onSignal: handleSignal
    });

    // Auto-archive expired signals
    useEffect(() => {
        if (!autoArchive) return;

        const interval = setInterval(() => {
            const now = new Date();
            setSignals(prev => {
                const expired = prev.filter(s => {
                    if (!s.expires_at) return false;
                    return new Date(s.expires_at) < now;
                });

                if (expired.length > 0) {
                    setArchived(old => [...old, ...expired]);
                    return prev.filter(s => !expired.includes(s));
                }
                return prev;
            });
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [autoArchive]);

    const updateSignalStatus = useCallback((id: string, status: Signal['status']) => {
        setSignals(prev => prev.map(s =>
            s.id === id ? { ...s, status } : s
        ));
    }, []);

    const archiveSignal = useCallback((id: string) => {
        const signal = signals.find(s => s.id === id);
        if (signal) {
            setArchived(prev => [...prev, signal]);
            setSignals(prev => prev.filter(s => s.id !== id));
        }
    }, [signals]);

    const removeSignal = useCallback((id: string) => {
        setSignals(prev => prev.filter(s => s.id !== id));
    }, []);

    return {
        signals,
        archived,
        isConnected,
        updateSignalStatus,
        archiveSignal,
        removeSignal,
        pendingSignals: signals.filter(s => s.status === 'pending'),
        approvedSignals: signals.filter(s => s.status === 'approved' || s.status === 'executed'),
        rejectedSignals: signals.filter(s => s.status === 'rejected'),
    };
}
