/**
 * Leaderboard API
 * GET /api/gamification/leaderboard - Get weekly leaderboard
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLeaderboard, initializeGamificationTables } from '@/lib/gamification';

export async function GET() {
    try {
        // Get user ID from Privy session cookie
        const cookieStore = await cookies();
        const privyToken = cookieStore.get('privy-token');

        let userId = 'unknown';
        if (privyToken) {
            const tokenParts = privyToken.value.split('.');
            if (tokenParts.length >= 2) {
                try {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    userId = payload.sub || payload.userId || 'unknown';
                } catch {
                    userId = privyToken.value.slice(0, 32);
                }
            }
        }

        // Initialize tables if needed
        await initializeGamificationTables();

        // Get leaderboard with user context
        const leaderboard = await getLeaderboard(userId, 50);

        return NextResponse.json({
            leaderboard,
            weekStart: getWeekStart(),
            weekEnd: getWeekEnd()
        });
    } catch (error) {
        console.error('❌ Error fetching leaderboard:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}

function getWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
}

function getWeekEnd(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? 0 : 7); // Sunday
    const sunday = new Date(now.setDate(diff));
    return sunday.toISOString().split('T')[0];
}
