/**
 * Signal Fan-Out Engine (account-centric)
 * =======================================
 * Processes a new signal from the backend and fans it out to every NAMED
 * ACCOUNT subscribed to that strategy. For each account:
 *   1. Selects the risk tier from the signal payload (account.risk_level)
 *   2. Generates delta orders sized to the account's current NLV
 *   3. Pre-executes the orders into the account's ledger (account_activities)
 *   4. Saves an NLV snapshot and emails the account owner
 *
 * The account model is the primary path. The legacy per-user functions
 * (fanoutSignalToUsers / processUserSignal) are preserved at the bottom for
 * back-compat but are no longer called by the notify route.
 */

import pool from '@/lib/db';
import {
    listAccountsByStrategy,
    getAccount,
    saveAccountPnlSnapshot,
    getAccountPositions,
    getLatestAccountNlv,
    initializeAccountTables,
    type Account,
} from '@/lib/accounts';
import { generateAccountOrders, executeAccountOrders } from '@/lib/account-executor';
import type { GenericSignal, SignalLeg } from '@/lib/per-user-order-generator';
import { sendSignalEmail, sendPhaseTransitionEmail } from '@/lib/signal-email';

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
    accountsProcessed: number;
    accountsEmailed: number;
    errors: string[];
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Fan out a signal to all accounts subscribed to the signal's strategy.
 * Called when a new signal arrives from the backend (notify route).
 */
export async function fanoutSignal(signalId: string, signalData: SignalData): Promise<FanoutResult> {
    const strategy = signalData.strategy;
    const result: FanoutResult = {
        signalId,
        strategy,
        accountsProcessed: 0,
        accountsEmailed: 0,
        errors: [],
    };

    try {
        await initializeAccountTables();

        // 1. Find all accounts subscribed to this strategy
        const accounts = await listAccountsByStrategy(strategy);

        if (accounts.length === 0) {
            console.log(`[Fanout] No accounts subscribed to strategy ${strategy}`);
            return result;
        }

        console.log(`[Fanout] Processing signal ${signalId} for ${accounts.length} account(s)`);

        // 2. Process each account
        for (const account of accounts) {
            try {
                const emailed = await processAccountSignal(account, signalId, signalData);
                result.accountsProcessed++;
                if (emailed) result.accountsEmailed++;
            } catch (err) {
                const msg = `Account ${account.id} (${account.name}): ${err instanceof Error ? err.message : String(err)}`;
                console.error(`[Fanout] ${msg}`);
                result.errors.push(msg);
            }
        }

        console.log(`[Fanout] Completed signal ${signalId}: ${result.accountsProcessed} accounts, ${result.errors.length} errors`);
        return result;
    } catch (err) {
        console.error(`[Fanout] Fatal error processing signal ${signalId}:`, err);
        result.errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
        return result;
    }
}

// ─── Per-Account Processing ──────────────────────────────────────────────────

async function processAccountSignal(account: Account, signalId: string, signalData: SignalData): Promise<boolean> {
    // 1. Select the tier for this account's risk level (entry strictness)
    const tieredSignal = selectTier(signalData, account.risk_level);
    tieredSignal.id = signalId;

    // 2. Generate delta orders sized to the account's NLV, capped by its phase.
    //    Pass the prior recorded NLV so the phase engine can detect emergency
    //    drawdowns. The signal is thus customized by account + strategy +
    //    current position + available cash + capital-scaling phase.
    const priorNlv = await getLatestAccountNlv(account.id);
    const orders = await generateAccountOrders(tieredSignal, account.id, priorNlv);
    const phaseMeta = orders as unknown as {
        phase?: string; phaseCap?: number; phaseTransitioned?: boolean;
        phaseFrom?: string | null; phaseReason?: string | null;
    };

    // 3. Pre-execute into the account ledger (idempotent per account+signal).
    //    Executes both equity and option legs (options as virtual positions).
    if (orders.equityOrders.length > 0 || orders.optionsOrders.length > 0) {
        const exec = await executeAccountOrders(account.id, signalId, orders.equityOrders, orders.optionsOrders);
        if (!exec.success && !exec.alreadyExecuted) {
            throw new Error('Virtual execution failed');
        }
    }

    // 4. Snapshot NLV vs principal
    const fresh = await getAccount(account.id);
    if (fresh) {
        // positionsValue = NLV - cash. generateAccountOrders already values
        // options at the 100x contract multiplier, so this is correct as-is.
        const positionsValue = orders.virtualNlv - fresh.cash_balance;
        const today = new Date().toISOString().split('T')[0];
        await saveAccountPnlSnapshot(account.id, today, fresh.cash_balance, positionsValue, fresh.initial_principal);
    }

    // 5. Email the account owner (signal + any phase transition)
    const email = await getUserEmail(account.user_id);
    if (email) {
        // Standalone phase-transition alert (only on a real promotion/demotion,
        // not the initial assignment).
        if (phaseMeta.phaseTransitioned && phaseMeta.phaseFrom && phaseMeta.phase) {
            await sendPhaseTransitionEmail(email, {
                accountName: account.name,
                strategy: account.strategy,
                riskLevel: account.risk_level,
                fromPhase: phaseMeta.phaseFrom,
                toPhase: phaseMeta.phase,
                reason: phaseMeta.phaseReason || 'TRANSITION',
                nlv: orders.virtualNlv,
                phaseCap: phaseMeta.phaseCap ?? 0,
            });
        }

        const phaseLabel = phaseMeta.phase ? ` · ${phaseMeta.phase} phase` : '';
        const rationale = `${signalData.rationale || ''} [${account.name} · ${account.risk_level}${phaseLabel}]`;
        await sendSignalEmail(email, {
            strategy: account.strategy,
            regime: signalData.regime,
            confidence: signalData.confidence,
            rationale,
            equityOrders: orders.equityOrders,
            optionsCloses: [],
            optionsEntries: orders.optionsOrders,
            skipOptions: orders.skipOptions,
            skipReason: orders.skipReason,
            live: false,
            accountName: account.name,
            broker: (account as any).broker,
            signalTimestamp: (signalData as any).timestamp || (signalData as any).created_at,
        });
        return true;
    }
    return false;
}

// ─── Tier Selection ──────────────────────────────────────────────────────────

/**
 * Select the correct risk tier from the signal payload.
 * Falls back to the flat target_allocation if tiers are not present (back-compat).
 */
function selectTier(signalData: SignalData, riskLevel: 'conservative' | 'moderate' | 'aggressive'): GenericSignal {
    const tiers = signalData.tiers;

    if (!tiers || !tiers[riskLevel]) {
        console.log(`[Fanout] No tiers in signal, using flat allocation for ${riskLevel}`);
        return {
            id: '',
            strategy: signalData.strategy,
            regime: signalData.regime,
            confidence: signalData.confidence,
            rationale: signalData.rationale,
            legs: signalData.legs || [],
        };
    }

    const tierData = tiers[riskLevel];
    const allocation = tierData.target_allocation || {};
    const legs: SignalLeg[] = Object.entries(allocation)
        .filter(([_, pct]) => pct > 0)
        .map(([symbol, target_pct]) => ({ symbol, target_pct, leg_type: 'equity' as const }));

    console.log(`[Fanout] Selected ${riskLevel} tier: ${JSON.stringify(allocation)}`);

    return {
        id: '',
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
        // users.id is a uuid, but account user_ids are Privy DIDs ("did:privy:...").
        // Cast the column to text so the comparison never trips a uuid parse error.
        const res = await pool.query(`SELECT email FROM users WHERE id::text = $1`, [userId]);
        return res.rows[0]?.email || null;
    } catch (err) {
        console.warn(`[Fanout] Failed to fetch email for user ${userId}:`, err);
        return null;
    }
}
