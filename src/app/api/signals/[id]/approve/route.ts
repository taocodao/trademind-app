import { NextRequest, NextResponse } from 'next/server';
import { getPrivyUserId } from '@/lib/auth-helpers';
import { createUserExecution } from '@/lib/db';

/**
 * Records that the user has manually entered a signal in their own broker.
 * TradeMind does not place or mirror an order from this endpoint.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getPrivyUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        await createUserExecution(userId, id, 'executed', undefined, body.source || 'manual');

        return NextResponse.json({
            status: 'success',
            message: 'Signal confirmation recorded.',
        });
    } catch (error) {
        console.error('[approve signal] confirmation failed:', error);
        return NextResponse.json({ error: 'Unable to record signal confirmation' }, { status: 500 });
    }
}
