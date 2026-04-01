import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getShadowPositions, createShadowPosition, clearShadowPositions, createUserExecution, query } from '@/lib/db';

async function getUserId() {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get("privy-token")?.value;
    if (privyToken) {
        try {
            const payload = privyToken.split(".")[1];
            const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
            return decoded.sub || decoded.privy_did || decoded.userId || "default-user";
        } catch (err) {
            console.warn("Could not decode Privy token", err);
        }
    }
    return "default-user";
}

// ── GET: list shadow positions ────────────────────────────────────────────────
export async function GET(request: Request) {
    try {
        const userId = await getUserId();
        const { searchParams } = new URL(request.url);
        const strategy = searchParams.get('strategy') || undefined;

        // Raw query so we can pick up instrument_type + leg_action columns
        // (added via migration — COALESCE guards pre-migration rows)
        let queryText = `
            SELECT id, user_id, strategy, symbol, quantity, avg_price, signal_id, executed_at,
                   COALESCE(instrument_type, 'equity') AS instrument_type,
                   leg_action
            FROM shadow_positions WHERE user_id = $1`;
        const params: unknown[] = [userId];
        if (strategy) {
            queryText += ` AND strategy = $2`;
            params.push(strategy);
        }
        queryText += ` ORDER BY instrument_type DESC, symbol ASC`; // options rows first

        const result = await query(queryText, params);
        return NextResponse.json({ positions: result.rows, status: 'success' });
    } catch (error) {
        console.error('Failed to get shadow positions:', error);
        return NextResponse.json({ error: 'Failed to retrieve shadow positions' }, { status: 500 });
    }
}

// ── POST: bulk sync / create ──────────────────────────────────────────────────
export async function POST(request: Request) {
    try {
        const userId = await getUserId();
        const body = await request.json();
        const { strategy, symbol, quantity, avgPrice, signalId, action, orders } = body;

        if (action === 'clear' && strategy) {
            await clearShadowPositions(userId, strategy);
            return NextResponse.json({ status: 'success', message: `Cleared positions for ${strategy}` });
        }

        if (action === 'sync' && strategy && Array.isArray(orders)) {
            const results = [];
            for (const order of orders) {
                const qty = order.action === 'sell' ? -Math.abs(order.quantity) : Math.abs(order.quantity);
                const pos = await createShadowPosition(userId, strategy, order.symbol, qty, order.price || 0, signalId);
                results.push(pos);
            }
            if (signalId) await createUserExecution(userId, signalId, 'executed', `shadow-${Date.now()}`, strategy);
            return NextResponse.json({ positions: results, status: 'success' });
        }

        if (!strategy || !symbol || quantity === undefined || avgPrice === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const position = await createShadowPosition(userId, strategy, symbol, quantity, avgPrice, signalId);
        if (signalId) await createUserExecution(userId, String(signalId), 'executed', `shadow-${Date.now()}`, strategy);
        return NextResponse.json({ position, status: 'success' });
    } catch (error) {
        console.error('Failed to modify shadow position:', error);
        return NextResponse.json({ error: 'Failed to modify shadow position' }, { status: 500 });
    }
}

// ── PUT: manually add or edit a shadow position ───────────────────────────────
// Body: { strategy, symbol, quantity, avgPrice }
export async function PUT(request: Request) {
    try {
        const userId = await getUserId();
        const { strategy, symbol, quantity, avgPrice } = await request.json();

        if (!strategy || !symbol || quantity === undefined || avgPrice === undefined) {
            return NextResponse.json({ error: 'Missing: strategy, symbol, quantity, avgPrice' }, { status: 400 });
        }

        const qty   = parseFloat(String(quantity));
        const price = parseFloat(String(avgPrice));

        if (qty <= 0) {
            // qty=0 → treat as delete
            await query(
                `DELETE FROM shadow_positions WHERE user_id=$1 AND strategy=$2 AND symbol=$3`,
                [userId, strategy, symbol.toUpperCase()]
            );
            return NextResponse.json({ status: 'success', message: `Deleted ${symbol}` });
        }

        await query(
            `INSERT INTO shadow_positions (user_id, strategy, symbol, quantity, avg_price, executed_at)
             VALUES ($1,$2,$3,$4,$5,NOW())
             ON CONFLICT (user_id,strategy,symbol)
             DO UPDATE SET quantity=$4, avg_price=$5, executed_at=NOW()`,
            [userId, strategy, symbol.toUpperCase(), qty, price]
        );

        return NextResponse.json({ status: 'success', symbol: symbol.toUpperCase(), quantity: qty, avgPrice: price });
    } catch (error) {
        console.error('Failed to update shadow position:', error);
        return NextResponse.json({ error: 'Failed to update position' }, { status: 500 });
    }
}

// ── DELETE: remove a shadow position ─────────────────────────────────────────
// Query params: ?strategy=X&symbol=QQQ
export async function DELETE(request: Request) {
    try {
        const userId = await getUserId();
        const { searchParams } = new URL(request.url);
        const strategy = searchParams.get('strategy');
        const symbol   = searchParams.get('symbol');

        if (!strategy || !symbol) {
            return NextResponse.json({ error: 'Missing strategy or symbol' }, { status: 400 });
        }

        await query(
            `DELETE FROM shadow_positions WHERE user_id=$1 AND strategy=$2 AND symbol=$3`,
            [userId, strategy, symbol.toUpperCase()]
        );

        return NextResponse.json({ status: 'success', message: `Removed ${symbol} from ${strategy}` });
    } catch (error) {
        console.error('Failed to delete shadow position:', error);
        return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 });
    }
}
