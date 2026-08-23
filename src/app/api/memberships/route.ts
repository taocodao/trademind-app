import { NextResponse } from 'next/server';
import { listMembershipsForUser, isMembershipEntitled } from '@/lib/membership';
import { getUserId } from '@/lib/auth';

// GET /api/memberships — every membership the login holds, one per account
export async function GET() {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const memberships = await listMembershipsForUser(userId);
        return NextResponse.json({
            memberships: memberships.map((m) => ({ ...m, entitled: isMembershipEntitled(m) })),
        });
    } catch (err) {
        console.error('[memberships] list failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
