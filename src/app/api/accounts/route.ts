import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAccount, listAccounts, type RiskLevel } from '@/lib/accounts';
import { getStrategy } from '@/lib/strategies';

async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) return null;
    try {
        const payload = privyToken.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.sub || decoded.privy_did || decoded.userId || null;
    } catch {
        return null;
    }
}

// GET /api/accounts — list the user's named accounts
export async function GET() {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const accounts = await listAccounts(userId);
        return NextResponse.json({ accounts });
    } catch (err) {
        console.error('[accounts] list failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/accounts — create a named account
export async function POST(req: NextRequest) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json();
        const { name, strategy, riskLevel, initialPrincipal } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
        }
        if (!strategy || !getStrategy(strategy)) {
            return NextResponse.json({ error: 'A valid strategy is required' }, { status: 400 });
        }
        const risk: RiskLevel = ['conservative', 'moderate', 'aggressive'].includes(riskLevel) ? riskLevel : 'moderate';
        const principal = Number(initialPrincipal);
        if (!isFinite(principal) || principal < 0) {
            return NextResponse.json({ error: 'Initial principal must be a non-negative number' }, { status: 400 });
        }

        const account = await createAccount(userId, name, strategy, risk, principal);
        return NextResponse.json({ account }, { status: 201 });
    } catch (err) {
        console.error('[accounts] create failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
