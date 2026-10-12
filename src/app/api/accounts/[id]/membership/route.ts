import { syncMembershipsFromStripe } from '@/lib/membership-sync';
import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { getMembershipByAccount, isMembershipEntitled } from '@/lib/membership';
import { getUserId } from '@/lib/auth';

// GET /api/accounts/[id]/membership — the membership for one account
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const account = await getAccount(Number(id), userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    const found = await getMembershipByAccount(account.id);
    const membership = found ? (await syncMembershipsFromStripe([found]))[0] : null;
    if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    return NextResponse.json({ membership, entitled: isMembershipEntitled(membership) });
}
