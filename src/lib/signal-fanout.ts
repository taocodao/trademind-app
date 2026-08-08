/**
 * Signal Fan-Out Engine
 * =====================
 * Processes a new signal from the backend and fans it out to all users
 * who have configured that strategy. For each user:
 *   1. Selects the correct risk tier from the signal payload
 *   2. Generates per-user delta orders based on their virtual account state
 *   3. Pre-executes the orders into their virtual account
 *   4. Sends an email with the signal + orders + virtual P&L snapshot
 *
 * This replaces the old model where signals were generic and users had to
 * manually approve them. Now signals are pre-executed virtually and users
 * receive an email they can use to manually enter the same orders in their
 * real brokerage account.
 */

import pool, {
    getUserStrategySettings,
    getVirtualAccountPrincipal,
    saveVirtualPnlSnapshot,
    getVirtualBalance,
} from '@/lib/db';
import { generateUserOrders, type GenericSignal, type SignalLeg } from '@/lib/per-user-order-generator';
import { executeVirtualOrders } from '@/lib/virtual-executor';
import { sendSignalEmail } from '@/lib/signal-email';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SignalData {
    strategy: string;
    regime?: string;
    confidence?: number;
    rationale?: string;
    legs?: SignalLeg[];
    tiers?: {
        conservative?: { target_allocation?: Record<string, number>; tier?: string };
        moderate?: { target_allocation?: Record<string, number>; tier?: string };
        aggressive?: { target_allocation?: Record<string, number>; tier?: string };
    };
    target_allocation?: Record<string, number>; // back-compat flat field
    [key: string]: unknown;
}

interface FanoutResult {
    signalId: string;
    strategy: string;
    usersProcessed: number;
    usersEmailed: number;
    errors: string[];
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Fan out a signal to all users who have configured the strategy.
 * Called when a new signal arrives from the backend.
 */
export async function fanoutSignal(signalId: string, signalData: SignalData): Promise<FanoutResult> {
    const strategy = signalData.strategy;
    const result: FanoutResult = {
        signalId,
        strategy,
        usersProcessed: 0,
        usersEmailed: 0,
        errors: [],
    };

    try {
        // 1. Find all users who have configured this strategy
        const usersRes = await pool.query(
            `SELECT DISTINCT user_id FROM user_strategy_settings WHERE strategy = $1`,
            [strategy]
        );

        if (usersRes.rows.length === 0) {
            console.log(`[Fanout] No users configured for strategy ${strategy}`);
            return result;
        }

        console.log(`[Fanout] Processing signal ${signalId} for ${usersRes.rows.length} users`);

        // 2. Process each user
        for (const row of usersRes.rows) {
            const userId = row.user_id;
            try {
                await processUserSignal(userId, signalId, signalData);
                result.usersProcessed++;
                result.usersEmailed++; // Assume email sent unless error
            } catch (err) {
                const msg = `User ${userId}: ${err instanceof Error ? err.message : String(err)}`;
                console.error(`[Fanout] ${msg}`);
                result.errors.push(msg);
            }
        }

        console.log(`[Fanout] Completed signal ${signalId}: ${result.usersProcessed} processed, ${result.errors.length} errors`);
        return result;

    } catch (err) {
        console.error(`[Fanout] Fatal error processing signal ${signalId}:`, err);
        result.errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
        return result;
    }
}

// ─── Per-User Processing ─────────────────────────────────────────────────────

async function processUserSignal(userId: string, signalId: string, signalData: SignalData): Promise<void> {
    const strategy = signalData.strategy;

    // 1. Get user's risk tier for this strategy
    const settings = await getUserStrategySettings(userId, strategy);
    const riskLevel = settings?.risk_level || 'moderate';

    // 2. Select the correct tier from the signal payload
    const tieredSignal = selectTier(signalData, riskLevel);

    // 3. Generate per-user orders
    const userOrders = await generateUserOrders(tieredSignal, userId, strategy);

    // 4. Pre-execute into virtual account
    if (userOrders.equityOrders.length > 0) {
        const execResult = await executeVirtualOrders(
            userId,
            signalId,
            strategy,
            userOrders.equityOrders.map(o => ({
                symbol: o.symbol,
                action: o.action,
                quantity: o.quantity,
                price: o.price,
            }))
        );

        if (!execResult.success && !execResult.alreadyExecuted) {
            throw new Error(`Virtual execution failed for user ${userId}`);
        }
    }

    // 5. Compute P&L snapshot
    const principal = await getVirtualAccountPrincipal(userId, strategy);
    const balanceInfo = await getVirtualBalance(userId, strategy);
    const positionsValue = userOrders.virtualNlv - balanceInfo.balance;
    const today = new Date().toISOString().split('T')[0];

    await saveVirtualPnlSnapshot(
        userId,
        strategy,
        today,
        balanceInfo.balance,
        positionsValue,
        principal
    );

    // 6. Send email
    const userEmail = await getUserEmail(userId);
    if (userEmail) {
        await sendSignalEmail(userEmail, {
            strategy,
            regime: signalData.regime,
            confidence: signalData.confidence,
            rationale: signalData.rationale,
            equityOrders: userOrders.equityOrders,
            optionsCloses: [], // TODO: wire options exit scanner
            optionsEntries: userOrders.optionsOrders,
            skipOptions: userOrders.skipOptions,
            skipReason: userOrders.skipReason,
            live: false, // virtual execution, not live brokerage
        });
    }
}

// ─── Tier Selection ──────────────────────────────────────────────────────────

/**
 * Select the correct risk tier from the signal payload.
 * Falls back to the flat target_allocation if tiers are not present (back-compat).
 */
function selectTier(signalData: SignalData, riskLevel: 'conservative' | 'moderate' | 'aggressive'): GenericSignal {
    const tiers = signalData.tiers;

    // If no tiers present, use the flat signal as-is (back-compat)
    if (!tiers || !tiers[riskLevel]) {
        console.log(`[Fanout] No tiers in signal, using flat allocation for ${riskLevel}`);
        return {
            id: '', // Will be set by caller
            strategy: signalData.strategy,
            regime: signalData.regime,
            confidence: signalData.confidence,
            rationale: signalData.rationale,
            legs: signalData.legs || [],
        };
    }

    // Select the tier's allocation
    const tierData = tiers[riskLevel];
    const allocation = tierData.target_allocation || {};

    // Convert allocation to legs format
    const legs: SignalLeg[] = Object.entries(allocation)
        .filter(([_, pct]) => pct > 0)
        .map(([symbol, target_pct]) => ({
            symbol,
            target_pct,
            leg_type: 'equity' as const,
        }));

    console.log(`[Fanout] Selected ${riskLevel} tier: ${JSON.stringify(allocation)}`);

    return {
        id: '', // Will be set by caller
        strategy: signalData.strategy,
        regime: signalData.regime,
        confidence: signalData.confidence,
        rationale: `${signalData.rationale || ''} [${riskLevel} tier]`,
        legs,
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getUserEmail(userId: string): Promise<string | null> {
    try {
        const res = await pool.query(
            `SELECT email FROM users WHERE id = $1`,
            [userId]
        );
        return res.rows[0]?.email || null;
    } catch (err) {
        console.warn(`[Fanout] Failed to fetch email for user ${userId}:`, err);
        return null;
    }
}
