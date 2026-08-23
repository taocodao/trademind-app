import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isMembershipEntitled, listMembershipsForUser } from '@/lib/membership';

async function getUserId(req: NextRequest): Promise<string | null> {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('privy-user-id')?.value;
    if (cookieUserId) return cookieUserId;
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return null;
    try {
        const payload = JSON.parse(Buffer.from(authorization.slice(7).split('.')[1], 'base64url').toString());
        return payload?.sub || payload?.privy_did || null;
    } catch {
        return null;
    }
}

// GET /api/memberships returns one membership for every account the login owns.
export async function GET(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const memberships = await listMembershipsForUser(userId);
        return NextResponse.json({
            memberships: memberships.map((membership) => ({
                ...membership,
                entitled: isMembershipEntitled(membership),
            })),
        });
    } catch (error) {
        console.error('[memberships] list failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
