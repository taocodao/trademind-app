'use client';

import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

// Must match SignalProvider.tsx
const SIGNAL_TTL_MS = 30 * 60 * 1000;

interface ExpirationBadgeProps {
    receivedAt?: number;
    createdAt?: string;
    onExpired?: () => void;
}

/**
 * Shows a live countdown "Expires in X min" badge on signal cards.
 * Calls onExpired when the signal reaches 0 minutes remaining.
 */
export function ExpirationBadge({ receivedAt, createdAt, onExpired }: ExpirationBadgeProps) {
    const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

    useEffect(() => {
        const origin = receivedAt || (createdAt ? new Date(createdAt).getTime() : null);
        if (!origin) return;

        const update = () => {
            const elapsed = Date.now() - origin;
            const remaining = Math.max(0, Math.ceil((SIGNAL_TTL_MS - elapsed) / 60000));
            setMinutesLeft(remaining);
            if (remaining <= 0 && onExpired) {
                onExpired();
            }
        };

        update();
        const interval = setInterval(update, 15000); // Update every 15s
        return () => clearInterval(interval);
    }, [receivedAt, createdAt, onExpired]);

    if (minutesLeft === null) return null;

    const isUrgent = minutesLeft <= 5;
    const colorClass = isUrgent
        ? 'text-tm-red bg-tm-red/15 border-tm-red/30'
        : minutesLeft <= 15
            ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
            : 'text-tm-muted bg-white/5 border-white/10';

    return (
        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
            <Timer className="w-3 h-3" />
            <span>{minutesLeft > 0 ? `${minutesLeft}m left` : 'Expired'}</span>
        </div>
    );
}
