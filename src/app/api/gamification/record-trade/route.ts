/**
 * Trade Result Recording API
 * POST /api/gamification/record-trade
 * 
 * Called when a position is closed to update gamification stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { recordTradeResult, checkAndAwardBadges } from '@/lib/gamification';

async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token');

    if (!privyToken) return null;

    const tokenParts = privyToken.value.split('.');
    if (tokenParts.length >= 2) {
        try {
            const payload = JSON.parse(atob(tokenParts[1]));
            return payload.sub || payload.userId || null;
        } catch {
            return privyToken.value.slice(0, 32);
        }
    }
    return null;
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { pnl, isWin, symbol, strategy } = body;

        if (typeof pnl !== 'number') {
            return NextResponse.json(
                { error: 'PnL must be a number' },
                { status: 400 }
            );
        }

        // Record the trade result
        const newBadges = await recordTradeResult(userId, pnl, isWin ?? pnl > 0);

        // Return newly earned badges for notification
        return NextResponse.json({
            success: true,
            pnl,
            isWin: isWin ?? pnl > 0,
            symbol,
            strategy,
            newBadges: newBadges.map(b => ({
                type: b.type,
                name: b.name,
                icon: b.icon
            }))
        });
    } catch (error) {
        console.error('❌ Error recording trade result:', error);
        return NextResponse.json(
            { error: 'Failed to record trade result' },
            { status: 500 }
        );
    }
}
