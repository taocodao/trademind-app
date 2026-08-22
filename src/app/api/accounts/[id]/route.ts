import { NextRequest, NextResponse } from 'next/server';
import { getAccount, renameAccount, deleteAccount, updateAccountRiskLevel, type RiskLevel } from '@/lib/accounts';
import { getUserId } from '@/lib/auth';

// GET /api/accounts/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const account = await getAccount(Number(id), userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    return NextResponse.json({ account });
}

// PATCH /api/accounts/[id], rename and/or change risk level
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const accountId = Number(id);
    const existing = await getAccount(accountId, userId);
    if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    try {
        const body = await req.json();
        let account = existing;
        if (typeof body.name === 'string' && body.name.trim().length > 0) {
            account = (await renameAccount(accountId, userId, body.name)) || account;
        }
        if (body.riskLevel && ['conservative', 'moderate', 'aggressive'].includes(body.riskLevel)) {
            account = (await updateAccountRiskLevel(accountId, userId, body.riskLevel as RiskLevel)) || account;
        }
        return NextResponse.json({ account });
    } catch (err) {
        console.error('[accounts] update failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/accounts/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const ok = await deleteAccount(Number(id), userId);
    if (!ok) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    return NextResponse.json({ success: true });
}
