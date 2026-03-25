import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPrivyUserId } from '@/lib/auth-helpers';
import { NextRequest } from 'next/server';

/**
 * Admin route: Reset a user's virtual account shadow positions and cash balance.
 * Used to clean up corrupted state from pre-fix additive upserts.
 * 
 * GET /api/admin/reset-virtual?strategy=TQQQ_TURBOCORE
 */
export async function GET(request: Request) {
    const userId = await getPrivyUserId(request as NextRequest);
    if (!userId) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const strategy = searchParams.get('strategy') || 'TQQQ_TURBOCORE';

    try {
        // 1. Delete all shadow positions for this user + strategy
        const delPos = await pool.query(
            `DELETE FROM shadow_positions WHERE user_id = $1 AND strategy = $2`,
            [userId, strategy]
        );

        // 2. Reset cash balance back to the default starting balance
        const defaultBalance = strategy.includes('PRO') ? 25000 : 25000;
        await pool.query(
            `INSERT INTO virtual_accounts (user_id, strategy, cash_balance)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, strategy) DO UPDATE SET cash_balance = $3, updated_at = NOW()`,
            [userId, strategy, defaultBalance]
        );

        // 3. Clear execution records so signals can be re-executed
        const delExec = await pool.query(
            `DELETE FROM user_signal_executions WHERE user_id = $1`,
            [userId]
        );

        return NextResponse.json({
            status: 'success',
            message: `Virtual account reset for strategy ${strategy}`,
            positionsDeleted: delPos.rowCount,
            executionsCleared: delExec.rowCount,
            newBalance: defaultBalance
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
