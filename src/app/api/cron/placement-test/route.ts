import { NextRequest, NextResponse } from 'next/server';
import { processDueTests } from '@/lib/newsletter/placement-test';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/** Sends due placement-test messages to owned seed mailboxes only. Cheap when the queue is empty. */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        return NextResponse.json({ ok: true, ...(await processDueTests(2)) });
    } catch (err) {
        console.error('[cron/placement-test]', err);
        return NextResponse.json({ error: 'Placement test tick failed' }, { status: 500 });
    }
}
