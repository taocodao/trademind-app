import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { executeVirtualOrders } from '@/lib/virtual-executor';
import { getTastytradeTokens } from '@/lib/redis';
import { createSession } from '@/lib/tastytrade-api';
import { executeSignal } from '@/lib/strategy-executor';

// Build the orders
async function buildVirtualOrdersFromSignal(signal: any, strategy: string, userId: string): Promise<any[]> {
    if ((signal.type || '').toUpperCase() === 'REBALANCE') {
        const contracts = Math.floor(signal.contracts) || 0;
        return [
            { id: `rebalance-1`, action: contracts > 0 ? 'buy' : 'sell', symbol: 'TQQQ', quantity: Math.abs(contracts), price: signal.cost }
        ];
    }
    return [
        { id: `leg-1`, action: 'buy', symbol: signal.symbol, quantity: 1, price: signal.cost }
    ];
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    // Internal API Authorization against accidental calls
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET || 'dev_secret_key'}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const signal = body.signal;
        const strategy = (signal.strategy || 'TQQQ_TURBOCORE').toLowerCase();

        console.log(`🤖 [GHOST EXECUTOR] Processing signal ${id} globally...`);

        // Get all users who are subscribed to this strategy AND have Auto Approve enabled
        const usersRes = await pool.query(`
            SELECT user_id, stripe_customer_id, subscription_tier 
            FROM user_settings 
            WHERE global_auto_approve = TRUE 
              AND subscription_status IN ('active', 'trialing')
        `);

        // Filter identically to Python script
        let targetTier = ['both_bundle'];
        if (strategy.includes('pro')) targetTier.push('turbocore_pro');
        else targetTier.push('turbocore');

        const eligibleUsers = usersRes.rows.filter(r => targetTier.includes(r.subscription_tier));

        console.log(`🤖 [GHOST EXECUTOR] Found ${eligibleUsers.length} users with Auto-Approve on.`);

        const results = [];

        for (const user of eligibleUsers) {
            const userId = user.user_id;

            // Attempt Live Brokerage Execution first!
            const tokens = await getTastytradeTokens(userId);
            if (tokens?.refreshToken) {
                try {
                    const clientId = process.env.TASTYTRADE_CLIENT_ID!;
                    const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET!;
                    
                    let accessToken = tokens.accessToken;
                    const tokenStillValid = tokens.expiresAt && tokens.expiresAt > Date.now();
                    
                    if (!tokenStillValid) {
                        const session = await createSession(clientId, clientSecret, tokens.refreshToken);
                        accessToken = session.accessToken;
                    }

                    // Fetch the user's Tastytrade Account ID dynamically using the valid access token
                    const acctRes = await fetch('https://api.tastyworks.com/customers/me/accounts', {
                         headers: { Authorization: accessToken }
                    });
                    const acctData = await acctRes.json();
                    const accountNumber = acctData.data.items[0].account['account-number'];

                    const txResult = await executeSignal(accessToken, accountNumber, signal, { front: '2025-01-01', back: '2025-01-01' });
                    results.push({ userId, status: 'success', live: true });
                    console.log(`✅ [GHOST EXECUTOR] Tastytrade processed for ${userId}`);
                    continue; // Done!
                } catch (liveErr) {
                    console.error(`❌ [GHOST EXECUTOR] Tastytrade execution failed for ${userId}:`, liveErr);
                    // Fallback to virtual is optional, but we skip to avoid double execution on network timeouts
                }
            } else {
                // Execute Virtually!
                try {
                    const orders = await buildVirtualOrdersFromSignal(signal, signal.strategy || 'TQQQ_TURBOCORE', userId);
                    const txResult = await executeVirtualOrders(userId, id, signal.strategy || 'TQQQ_TURBOCORE', orders);
                    results.push({ userId, status: txResult.alreadyExecuted ? 'already_executed' : 'success', live: false });
                    console.log(`✅ [GHOST EXECUTOR] Virtual executed for ${userId}`);
                } catch (virtErr) {
                    console.error(`❌ [GHOST EXECUTOR] Virtual execution failed for ${userId}:`, virtErr);
                }
            }
        }

        return NextResponse.json({ success: true, processed: results.length, details: results });
    } catch (e) {
        console.error('Ghost Executor Global Error:', e);
        return NextResponse.json({ error: 'Failed mapping Ghost loop' }, { status: 500 });
    }
}
