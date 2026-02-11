'use client';

import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

const MARKET_CLOSE_HOUR_ET = 16; // 4:00 PM

/**
 * Get market close time (4:00 PM ET) for a given date
 */
function getMarketCloseTime(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Create market close time: 4:00 PM ET
    const marketClose = new Date(year, month, day, MARKET_CLOSE_HOUR_ET, 0, 0, 0);

    // Adjust for ET timezone (approximate: -5 hours from UTC)
    const etOffset = 5 * 60 * 60 * 1000;
    const localOffset = marketClose.getTimezoneOffset() * 60 * 1000;

    return marketClose.getTime() - localOffset - etOffset;
}

interface ExpirationBadgeProps {
    receivedAt?: number;
    createdAt?: string;
    onExpired?: () => void;
}

/**
 * Shows countdown to market close (4:00 PM ET) on signal cards.
 */
export function ExpirationBadge({ receivedAt, createdAt, onExpired }: ExpirationBadgeProps) {
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const createdTime = receivedAt || (createdAt ? new Date(createdAt).getTime() : null);
        if (!createdTime) return;

        const createdDate = new Date(createdTime);
        const marketClose = getMarketCloseTime(createdDate);

        const update = () => {
            const now = Date.now();
            const remaining = marketClose - now;

            if (remaining <= 0) {
                setTimeLeft('Expired');
                setIsUrgent(true);
                if (onExpired) onExpired();
                return;
            }

            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m`);
                setIsUrgent(hours === 0 && minutes <= 30);
            } else {
                setTimeLeft(`${minutes}m`);
                setIsUrgent(minutes <= 30);
            }
        };

        update();
        const interval = setInterval(update, 15000); // Update every 15s
        return () => clearInterval(interval);
    }, [receivedAt, createdAt, onExpired]);

    if (!timeLeft) return null;

    const colorClass = timeLeft === 'Expired'
        ? 'text-tm-red bg-tm-red/15 border-tm-red/30'
        : isUrgent
            ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
            : 'text-tm-muted bg-white/5 border-white/10';

    return (
        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
            <Timer className="w-3 h-3" />
            <span>{timeLeft === 'Expired' ? 'Expired' : `${timeLeft} left`}</span>
        </div>
    );
}
