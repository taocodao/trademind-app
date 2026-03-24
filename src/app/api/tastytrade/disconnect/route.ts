import { NextResponse } from 'next/server';
import { unlinkTastytrade } from '@/lib/redis';
import { getPrivyUserId } from '@/lib/auth-helpers';

export async function POST() {
    try {
        const userId = await getPrivyUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Delete tokens from Redis
        await unlinkTastytrade(userId);

        console.log(`✅ Disconnected Tastytrade for user: ${userId}`);

        return NextResponse.json({
            success: true,
            message: 'Tastytrade account disconnected successfully'
        });

    } catch (error) {
        console.error('Disconnect error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to disconnect' },
            { status: 500 }
        );
    }
}
