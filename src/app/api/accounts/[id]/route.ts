import { NextRequest, NextResponse } from 'next/server';
import { getAccount, renameAccount, deleteAccount, updateAccountRiskLevel, updateAccountAlertEmail, updateAccountBroker, adjustAccountCash, type RiskLevel } from '@/lib/accounts';
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
        // Risk levels are retired (all accounts size at moderate); body.riskLevel is ignored.
        const VALID_BROKERS = ['schwab', 'tastytrade', 'fidelity', 'robinhood', 'ibkr', 'etrade', 'webull'];
        if (typeof body.broker === 'string' && VALID_BROKERS.includes(body.broker)) {
            account = (await updateAccountBroker(accountId, userId, body.broker)) || account;
        }
        if (body.cashAction !== undefined) {
            const type = body.cashAction === 'withdraw' ? 'withdraw' : body.cashAction === 'deposit' ? 'deposit' : null;
            const amount = Number(body.cashAmount);
            if (!type || !isFinite(amount) || amount <= 0) {
                return NextResponse.json({ error: 'cashAction must be deposit or withdraw with a positive cashAmount' }, { status: 400 });
            }
            const result = await adjustAccountCash(accountId, userId, type, amount);
            if ('error' in result) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            account = result.account;
        }
        if (body.alertEmail !== undefined) {
            const alert = typeof body.alertEmail === 'string' && body.alertEmail.includes('@') ? body.alertEmail.trim() : null;
            account = (await updateAccountAlertEmail(accountId, userId, alert)) || account;
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
