/**
 * Positions API Route
 * Get user's trading positions from PostgreSQL database
 */

import { NextResponse } from 'next/server';
import { getUserPositions } from '@/lib/db';
import { cookies } from 'next/headers';

async function getUserIdFromCookie(): Promise<string> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get("privy-token")?.value;

    if (privyToken) {
        try {
            const payload = privyToken.split(".")[1];
            const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
            return decoded.sub || decoded.userId || "default-user";
        } catch {
            // Fall through
        }
    }
    return "default-user";
}

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromCookie();

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
