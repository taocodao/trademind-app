import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAccount } from '@/lib/accounts';
import { getUserId } from '@/lib/auth';

// GET /api/accounts/[id]/signals — signals delivered to this account, newest
// first, each with its per-account execution status. The account_signals row
// is the idempotency record written by the fan-out; the signals row carries
// the published content.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const accountId = Number(id);
    if (!Number.isInteger(accountId) || accountId <= 0) {
        return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
    }

    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    try {
        const res = await pool.query(
            `SELECT a.signal_id,
                    a.status        AS account_status,
                    a.created_at    AS received_at,
                    a.confirmed_at,
                    a.fill_details,
                    a.fill_note,
                    s.strategy,
                    s.symbol,
                    s.status        AS signal_status,
                    s.data,
                    s.created_at    AS published_at
             FROM account_signals a
             LEFT JOIN signals s ON s.id::text = a.signal_id
             WHERE a.account_id = $1
             ORDER BY a.created_at DESC
             LIMIT 50`,
            [accountId]
        );

        // Per-account sized orders for these signals (ledger rows written by
        // the fan-out) so the cards can show the actual instruction blocks.
        const signalIds = res.rows.map((r: any) => r.signal_id);
        const ordersBySignal = new Map<string, any[]>();
        if (signalIds.length > 0) {
            const ord = await pool.query(
                `SELECT id, signal_id, type, symbol, quantity, price, note
                 FROM account_activities
                 WHERE account_id = $1 AND signal_id = ANY($2) AND type IN ('buy','sell')
                 ORDER BY created_at ASC`,
                [accountId, signalIds]
            );
            for (const o of ord.rows) {
                const list = ordersBySignal.get(o.signal_id) || [];
                // account_activities has no instrument_type column (only
                // positions carry it) - infer from the OCC-style symbol.
                const isOption = typeof o.symbol === 'string' && /^[A-Z.]+_?\d{4}-?\d{2}-?\d{2}[CP]\d|^[A-Z.]+_\d{8}[CP]\d/.test(o.symbol);
                list.push({
                    activityId: Number(o.id),
                    type: o.type,
                    symbol: o.symbol,
                    quantity: Number(o.quantity),
                    price: o.price != null ? Number(o.price) : null,
                    instrumentType: isOption ? 'option' : 'equity',
                    note: o.note,
                });
                ordersBySignal.set(o.signal_id, list);
            }
        }

        const signals = res.rows.map((r) => {
            let data: any = r.data;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch { data = {}; }
            }
            return {
                signalId: r.signal_id,
                accountStatus: r.account_status,
                receivedAt: r.received_at,
                publishedAt: r.published_at,
                confirmedAt: r.confirmed_at,
                fills: r.fill_details ?? null,
                fillNote: r.fill_note ?? null,
                orders: ordersBySignal.get(r.signal_id) || [],
                strategy: r.strategy,
                symbol: r.symbol,
                signalStatus: r.signal_status,
                action: data?.action ?? data?.type ?? null,
                summary: data?.summary ?? data?.title ?? null,
                regime: data?.regime ?? null,
                data: data ?? {},
            };
        });

        return NextResponse.json({ signals });
    } catch (err) {
        console.error('[accounts/signals] query failed', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
