/**
 * Gamification Stats API
 * GET /api/gamification/stats - Get user's gamification stats
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGamificationStats, initializeGamificationTables } from '@/lib/gamification';

export async function GET() {
    try {
        // Get user ID from Privy session cookie
        const cookieStore = await cookies();
        const privyToken = cookieStore.get('privy-token');

        if (!privyToken) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Decode Privy token to get user ID
        // In production, verify the token properly
        const tokenParts = privyToken.value.split('.');
        let userId = 'unknown';

        if (tokenParts.length >= 2) {
            try {
                const payload = JSON.parse(atob(tokenParts[1]));
                userId = payload.sub || payload.userId || 'unknown';
            } catch {
                userId = privyToken.value.slice(0, 32);
            }
        }

        // Initialize tables if needed
        await initializeGamificationTables();

        // Get stats
        const stats = await getGamificationStats(userId);

        if (!stats) {
            return NextResponse.json({
                currentStreak: 0,
                longestStreak: 0,
                totalWins: 0,
                totalTrades: 0,
                totalProfit: 0,
                weeklyProfit: 0,
                winRate: 0,
                badges: [],
                leaderboardRank: null
            });
        }

        return NextResponse.json(stats);
    } catch (error) {
        console.error('❌ Error fetching gamification stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch gamification stats' },
            { status: 500 }
        );
    }
}
