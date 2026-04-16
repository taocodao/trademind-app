import { NextRequest, NextResponse } from 'next/server';
import pool, { getUserExecutionForSignal, createUserExecution } from '@/lib/db';
import { executeVirtualOrders } from '@/lib/virtual-executor';
import { getTastytradeTokens } from '@/lib/redis';
import { createSession } from '@/lib/tastytrade-api';
import { executeSignal } from '@/lib/strategy-executor';
import { generateUserOrders, type GenericSignal } from '@/lib/per-user-order-generator';
import { scanOptionsExits, closeShadowOptionsPositions, saveShadowOptionsPositions } from '@/lib/options-exit-scanner';
import { sendSignalEmail } from '@/lib/signal-email';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Internal auth guard
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET || 'dev_secret_key'}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const signal: GenericSignal = body.signal;
        const strategy = (signal.strategy || 'TQQQ_TURBOCORE').toUpperCase();

        console.log(`🤖 [GHOST EXECUTOR] Processing signal ${id} (${strategy})...`);

        // ── Fetch eligible auto-approve users ─────────────────────────────────
        const usersRes = await pool.query(`
            SELECT us.user_id, us.subscription_tier, us.email, us.email_signal_alerts
            FROM user_settings us
            WHERE us.global_auto_approve = TRUE
              AND us.subscription_status IN ('active', 'trialing')
        `);

        // Filter by strategy tier
        const targetTiers: string[] = ['both_bundle'];
        if (strategy.includes('PRO')) targetTiers.push('turbocore_pro');
        else targetTiers.push('turbocore');

        const eligibleUsers = usersRes.rows.filter(r => targetTiers.includes(r.subscription_tier));
        console.log(`🤖 [GHOST EXECUTOR] Found ${eligibleUsers.length} eligible users.`);

        const results = [];

        for (const user of eligibleUsers) {
            const userId = user.user_id;

            try {
                await processUserSignal(userId, id, signal, strategy, user, results);
            } catch (userErr) {
                console.error(`❌ [GHOST EXECUTOR] Fatal error for user ${userId}:`, userErr);
                results.push({ userId, status: 'error', error: String(userErr) });
            }
        }

        return NextResponse.json({ success: true, processed: results.length, details: results });

    } catch (e) {
        console.error('[GHOST EXECUTOR] Global error:', e);
        return NextResponse.json({ error: 'Ghost Executor failed' }, { status: 500 });
    }
}

// ─── Per-User Execution Logic ─────────────────────────────────────────────────

async function processUserSignal(
    userId: string,
    signalId: string,
    signal: GenericSignal,
    strategy: string,
    user: { email?: string; email_signal_alerts?: boolean },
    results: any[]
) {
    // ── Idempotency guard ─────────────────────────────────────────────────────
    const existingExecution = await getUserExecutionForSignal(userId, signalId);
    if (existingExecution?.status === 'executed') {
        console.log(`⏭️ [GHOST] Skipping ${userId} — already executed ${signalId}`);
        results.push({ userId, status: 'already_executed' });
        return;
    }

    // ── Resolve Tastytrade tokens ─────────────────────────────────────────────
    const tokens = await getTastytradeTokens(userId);
    const hasTT = !!tokens?.refreshToken;
    let accessToken: string | undefined;
    let accountNumber: string | undefined;

    if (hasTT) {
        try {
            const tokenStillValid = tokens.expiresAt && tokens.expiresAt > Date.now();
            if (!tokenStillValid) {
                const session = await createSession(
                    process.env.TASTYTRADE_CLIENT_ID!,
                    process.env.TASTYTRADE_CLIENT_SECRET!,
                    tokens.refreshToken
                );
                accessToken = session.accessToken;
            } else {
                accessToken = tokens.accessToken;
            }

            // Fetch account number dynamically
            const acctRes = await fetch('https://api.tastyworks.com/customers/me/accounts', {
                headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'TradeMind/1.0' },
            });
            const acctData = await acctRes.json();
            accountNumber = acctData?.data?.items?.[0]?.account?.['account-number'];

            if (!accountNumber) {
                console.warn(`[GHOST] No TT account found for ${userId} — falling back to virtual`);
                accessToken = undefined;
            }
        } catch (authErr) {
            console.warn(`[GHOST] TT auth failed for ${userId} — falling back to virtual:`, authErr);
            accessToken = undefined;
            accountNumber = undefined;
        }
    }

    // ── STEP 1: Options exit scan ─────────────────────────────────────────────
    const exitScan = await scanOptionsExits(
        userId, strategy, signal.options_intent, accessToken, accountNumber
    );

    if (exitScan.closeLegs.length > 0) {
        console.log(`[GHOST] ${exitScan.closeLegs.length} options position(s) to close for ${userId}`);

        if (accessToken && accountNumber) {
            // Submit close orders to TT
            for (const leg of exitScan.closeLegs) {
                try {
                    const { submitOrder } = await import('@/lib/tastytrade-api');
                    await submitOrder(accessToken, accountNumber, {
                        timeInForce: 'Day',
                        orderType: 'Market',
                        legs: [{
                            instrumentType: leg.instrumentType,
                            symbol: leg.symbol,
                            quantity: leg.quantity,
                            action: leg.action as any,
                        }],
                    });
                    console.log(`✅ [GHOST] Closed TT position: ${leg.instruction}`);
                } catch (closeErr) {
                    console.error(`❌ [GHOST] Failed to close TT position ${leg.symbol}:`, closeErr);
                }
            }
        }

        // Always update shadow positions (for both TT and virtual users)
        await closeShadowOptionsPositions(userId, strategy, exitScan.closeLegs);
    }

    // ── STEP 2: Generate per-user entry orders ─────────────────────────────────
    const userOrders = await generateUserOrders(
        signal, userId, strategy, accessToken, accountNumber
    );

    console.log(
        `[GHOST] ${userId}: NLV=$${userOrders.virtualNlv.toFixed(0)}, ` +
        `equity orders=${userOrders.equityOrders.length}, ` +
        `options=${userOrders.skipOptions ? `SKIP (${userOrders.skipReason})` : userOrders.optionsOrders.length}`
    );

    // ── STEP 3: Execute equity orders ─────────────────────────────────────────
    let ttSuccess = false;

    if (accessToken && accountNumber && userOrders.equityOrders.length > 0) {
        try {
            const signalWithOrders = {
                ...signal,
                _preCalculatedOrders: userOrders.equityOrders,
            };
            await executeSignal(
                accessToken,
                accountNumber,
                signalWithOrders,
                { front: '2025-01-01', back: '2025-01-01' }
            );
            ttSuccess = true;
            console.log(`✅ [GHOST] Live TT equity execution succeeded for ${userId}`);
        } catch (ttErr) {
            console.error(`❌ [GHOST] TT equity execution failed for ${userId}:`, ttErr);
            // Fall back to virtual (Q2 decision: always update virtual so portfolio stays accurate)
        }
    }

    // Always mirror to virtual (both TT users on fallback AND pure virtual users)
    if (userOrders.equityOrders.length > 0) {
        try {
            await executeVirtualOrders(userId, signalId, strategy, userOrders.equityOrders);
            console.log(`✅ [GHOST] Virtual equity execution succeeded for ${userId}`);
        } catch (virtErr) {
            console.error(`❌ [GHOST] Virtual execution failed for ${userId}:`, virtErr);
        }
    }

    // ── STEP 4: Execute options orders ────────────────────────────────────────
    if (!userOrders.skipOptions && userOrders.optionsOrders.length > 0) {
        const realOptionsOrders = userOrders.optionsOrders.filter(o => !o.symbol.includes('PENDING'));

        if (accessToken && accountNumber && realOptionsOrders.length > 0) {
            try {
                const { submitOrder } = await import('@/lib/tastytrade-api');
                // Group all option legs into one multi-leg order
                const optLegs = realOptionsOrders.map(o => ({
                    instrumentType: o.instrumentType,
                    symbol: o.symbol,
                    quantity: o.quantity,
                    action: o.action as any,
                }));
                const firstLeg = realOptionsOrders[0];
                await submitOrder(accessToken, accountNumber, {
                    timeInForce: 'Day',
                    orderType: 'Limit',
                    price: realOptionsOrders.reduce((sum, o) => sum + o.limitPrice, 0),
                    priceEffect: firstLeg.priceEffect,
                    legs: optLegs,
                });
                console.log(`✅ [GHOST] Options order submitted for ${userId}`);
            } catch (optErr) {
                console.error(`❌ [GHOST] Options order failed for ${userId}:`, optErr);
            }
        }

        // Save options positions to shadow for all users (tracking)
        await saveShadowOptionsPositions(userId, strategy, realOptionsOrders, signalId);
    }

    // ── STEP 5: Record execution ───────────────────────────────────────────────
    const executionSource = ttSuccess ? 'live' : 'virtual';
    await createUserExecution(userId, signalId, 'executed', undefined, executionSource);

    // ── STEP 6: Send Resend email ─────────────────────────────────────────────
    if (user.email_signal_alerts && user.email) {
        // Non-blocking — do not await
        sendSignalEmail(user.email, {
            strategy,
            regime: signal.regime,
            confidence: signal.confidence,
            rationale: signal.rationale,
            equityOrders: userOrders.equityOrders,
            optionsCloses: exitScan.closeLegs,
            optionsEntries: userOrders.optionsOrders,
            skipOptions: userOrders.skipOptions,
            skipReason: userOrders.skipReason,
            live: ttSuccess,
        }).catch(err => console.error('[GHOST] Email send failed:', err));
    }

    results.push({ userId, status: 'success', live: ttSuccess });
    console.log(`✅ [GHOST] Completed for ${userId} (live=${ttSuccess})`);
}
