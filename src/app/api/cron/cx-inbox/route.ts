import { NextRequest, NextResponse } from 'next/server';
import { runWorkspaceReader } from '@/lib/outreach/workspace-reader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/** Reads the Workspace mailbox for bounces and replies to adviser mail sent through Workspace. Cheap when there are no Workspace sends. */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        return NextResponse.json({ ok: true, ...(await runWorkspaceReader()) });
    } catch (err) {
        console.error('[cron/cx-inbox]', err);
        return NextResponse.json({ error: 'Inbox read failed' }, { status: 500 });
    }
}
