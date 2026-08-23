import { NextRequest, NextResponse } from 'next/server';
import { getPrivyUserId } from '@/lib/auth-helpers';
import { createUserExecution } from '@/lib/db';

/** Records a manual options signal confirmation without broker execution. */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getPrivyUserId(request);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        await createUserExecution(userId, id, 'executed', undefined, body.source || 'manual');

        return NextResponse.json({ status: 'success', message: 'Options signal confirmation recorded.' });
    } catch (error) {
        console.error('[approve options] confirmation failed:', error);
        return NextResponse.json({ error: 'Unable to record options confirmation' }, { status: 500 });
    }
}
