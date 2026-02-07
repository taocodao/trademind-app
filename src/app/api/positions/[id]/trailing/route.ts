/**
 * Trailing Stop Configuration API
 * POST /api/positions/[id]/trailing
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

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

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: positionId } = await params;
        const body = await request.json();

        const { enabled, profitTarget, stopLoss, trailTrigger, trailDistance } = body;

        // Validate inputs
        if (typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 });
        }

        if (profitTarget < 0.1 || profitTarget > 1.0) {
            return NextResponse.json({ error: 'profitTarget must be 10-100%' }, { status: 400 });
        }

        if (stopLoss > 0 || stopLoss < -1.0) {
            return NextResponse.json({ error: 'stopLoss must be -100% to 0%' }, { status: 400 });
        }

        // First check if position exists and belongs to user
        const positionCheck = await query(
            `SELECT id FROM positions WHERE id = $1 AND user_id = $2`,
            [positionId, userId]
        );

        if (positionCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Position not found' }, { status: 404 });
        }

        // Update trailing config
        const trailingConfig = JSON.stringify({
            enabled,
            profitTarget,
            stopLoss,
            trailTrigger,
            trailDistance,
            updatedAt: new Date().toISOString()
        });

        await query(
            `UPDATE positions 
             SET trailing_config = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3`,
            [trailingConfig, positionId, userId]
        );

        return NextResponse.json({
            success: true,
            config: {
                enabled,
                profitTarget,
                stopLoss,
                trailTrigger,
                trailDistance
            }
        });

    } catch (error) {
        console.error('❌ Error updating trailing config:', error);
        return NextResponse.json(
            { error: 'Failed to update trailing config' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: positionId } = await params;

        const result = await query(
            `SELECT trailing_config FROM positions WHERE id = $1 AND user_id = $2`,
            [positionId, userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Position not found' }, { status: 404 });
        }

        const config = result.rows[0].trailing_config || {
            enabled: false,
            profitTarget: 0.6,
            stopLoss: -0.45,
            trailTrigger: 0.35,
            trailDistance: 0.15
        };

        return NextResponse.json(config);

    } catch (error) {
        console.error('❌ Error fetching trailing config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trailing config' },
            { status: 500 }
        );
    }
}
