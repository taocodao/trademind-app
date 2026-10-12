/**
 * Positions API Route
 * Get user's trading positions from PostgreSQL database
 */

import { getPrivyUserId } from '@/lib/auth-helpers';
import { NextResponse } from 'next/server';
import { getUserPositions } from '@/lib/db';
import { cookies } from 'next/headers';

/** Verified Privy user id (the middleware drops forged or expired cookies), or null when not signed in. */
async function getUserIdFromCookie(): Promise<string | null> {
    return getPrivyUserId();
}

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromCookie();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get status filter from query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;

        console.log(`📊 Fetching positions for user ${userId}, status: ${status || 'all'}`);

        // Fetch positions from database
        const positions = await getUserPositions(userId, status);

        console.log(`✅ Found ${positions.length} positions`);

        return NextResponse.json({
            positions: positions,
            count: positions.length,
        });

    } catch (error) {
        console.error('❌ Positions API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch positions', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
