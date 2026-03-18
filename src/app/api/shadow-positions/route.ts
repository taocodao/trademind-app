import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getShadowPositions, createShadowPosition, clearShadowPositions, createUserExecution } from '@/lib/db';

async function getUserId() {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get("privy-token")?.value;
    if (privyToken) {
        try {
            const payload = privyToken.split(".")[1];
            const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
            return decoded.sub || decoded.userId || "default-user";
        } catch (err) {
            console.warn("Could not decode Privy token", err);
        }
    }
    return "default-user";
}

export async function GET(request: Request) {
    try {
        const userId = await getUserId();
        const { searchParams } = new URL(request.url);
        const strategy = searchParams.get('strategy') || undefined;

        const positions = await getShadowPositions(userId, strategy);

        return NextResponse.json({ positions, status: 'success' });
    } catch (error) {
        console.error('Failed to get shadow positions:', error);
        return NextResponse.json({ error: 'Failed to retrieve shadow positions', status: 'error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getUserId();
        const body = await request.json();
        
        const { strategy, symbol, quantity, avgPrice, signalId, action, orders } = body;

        if (action === 'clear' && strategy) {
            // Rebalancing clear
            await clearShadowPositions(userId, strategy);
            return NextResponse.json({ status: 'success', message: `Cleared shadow positions for ${strategy}` });
        }

        if (action === 'sync' && strategy && Array.isArray(orders)) {
            // Execute multiple orders for a sync/rebalance
            const results = [];
            for (const order of orders) {
                // order format from calculate_delta_trade: { symbol, quantity, price, action: 'buy'|'sell' }
                const qty = order.action === 'sell' ? -Math.abs(order.quantity) : Math.abs(order.quantity);
                const pos = await createShadowPosition(userId, strategy, order.symbol, qty, order.price || 0, signalId);
                results.push(pos);
            }
            
            if (signalId) {
                // Mark as executed in the activity log
                await createUserExecution(userId, signalId, 'executed', `shadow-${Date.now()}`, strategy);
            }
            
            return NextResponse.json({ positions: results, status: 'success' });
        }

        if (!strategy || !symbol || quantity === undefined || avgPrice === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const position = await createShadowPosition(userId, strategy, symbol, quantity, avgPrice, signalId);

        if (signalId) {
             await createUserExecution(userId, String(signalId), 'executed', `shadow-${Date.now()}`, strategy);
        }

        return NextResponse.json({ position, status: 'success' });
    } catch (error) {
        console.error('Failed to modify shadow position:', error);
        return NextResponse.json({ error: 'Failed to modify shadow position', status: 'error' }, { status: 500 });
    }
}
