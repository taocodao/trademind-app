/**
 * LEAPS Executor
 * 
 * Handles the QQQ_LEAPS sleeve of TurboCore Pro rebalances:
 *  - Buy to Open if no position exists
 *  - Roll (Sell to Close old + Buy to Open new) if DTE <= 60
 *  - Rebalance contract count if allocation drift > 10%
 *  - Sell to Close if target allocation = 0 (BEAR regime)
 */
import { getLeapsCandidate, getOptionQuote, submitOrder } from './tastytrade-api';
import { getLeapsState, setLeapsState, clearLeapsState, getDaysToExpiration, type LeapsState } from './leaps-state';

const ROLL_THRESHOLD_DAYS = 60;       // Roll when DTE ≤ 60
const REBALANCE_TOLERANCE = 0.10;     // 10% drift triggers rebalance

interface LeapsExecutionParams {
    accessToken: string;
    accountNumber: string;
    userId: string;
    underlyingSymbol: string;         // "QQQ"
    underlyingPrice: number;          // Current QQQ price from equity quote
    targetAllocationPct: number;      // e.g. 0.35 = 35% of portfolio
    portfolioNetLiq: number;          // Account net liquidating value
}

interface LeapsExecutionResult {
    action: 'buy_to_open' | 'roll' | 'rebalance' | 'sell_to_close' | 'hold' | 'error';
    orderId?: string;
    message: string;
    newState?: LeapsState;
}

export async function executeLeapsAllocation(
    params: LeapsExecutionParams
): Promise<LeapsExecutionResult> {
    const {
        accessToken, accountNumber, userId,
        underlyingSymbol, underlyingPrice,
        targetAllocationPct, portfolioNetLiq
    } = params;

    const targetDollarValue = portfolioNetLiq * targetAllocationPct;
    const currentState = await getLeapsState(userId, accountNumber);

    // ── Case 1: Target = 0 (BEAR regime) → Sell everything ──────────────────
    if (targetAllocationPct <= 0.001) {
        if (!currentState || currentState.contracts === 0) {
            return { action: 'hold', message: 'No LEAPS to close. All cash.' };
        }
        return await sellLeapsToClose(accessToken, accountNumber, userId, currentState);
    }

    // ── Case 2: No existing LEAPS → Buy to Open ───────────────────────────
    if (!currentState || currentState.contracts === 0) {
        return await buyLeapsToOpen(
            accessToken, accountNumber, userId,
            underlyingSymbol, underlyingPrice,
            targetDollarValue
        );
    }

    // ── Case 3: Existing LEAPS needs rolling (DTE ≤ 60) ──────────────────
    const dte = getDaysToExpiration(currentState);
    if (dte <= ROLL_THRESHOLD_DAYS) {
        console.log(`⚡ LEAPS roll triggered: DTE=${dte}, threshold=${ROLL_THRESHOLD_DAYS}`);
        return await rollLeaps(
            accessToken, accountNumber, userId,
            currentState, underlyingSymbol, underlyingPrice, targetDollarValue
        );
    }

    // ── Case 4: Check if rebalance needed ─────────────────────────────────
    const currentQuote = await getOptionQuote(accessToken, currentState.occSymbol);
    if (!currentQuote) {
        return { action: 'error', message: `Cannot quote current LEAPS: ${currentState.occSymbol}` };
    }

    const currentValue = currentState.contracts * currentQuote.mid * 100;
    const drift = Math.abs(currentValue - targetDollarValue) / targetDollarValue;

    if (drift <= REBALANCE_TOLERANCE) {
        console.log(`✅ LEAPS in tolerance: current=$${currentValue.toFixed(0)}, target=$${targetDollarValue.toFixed(0)}, drift=${(drift*100).toFixed(1)}%`);
        return { action: 'hold', message: `LEAPS within ${REBALANCE_TOLERANCE * 100}% tolerance. No action.` };
    }

    // ── Case 5: Drift > tolerance → Rebalance ─────────────────────────────
    return await rebalanceLeaps(
        accessToken, accountNumber, userId,
        currentState, currentQuote, targetDollarValue
    );
}

// ─── Helper: Buy to Open ───────────────────────────────────────────────────

async function buyLeapsToOpen(
    accessToken: string, accountNumber: string, userId: string,
    underlying: string, underlyingPrice: number,
    targetDollarValue: number
): Promise<LeapsExecutionResult> {
    console.log(`📈 LEAPS Buy to Open: target $${targetDollarValue.toFixed(0)}`);

    const candidate = await getLeapsCandidate(accessToken, underlying, underlyingPrice);
    if (!candidate) return { action: 'error', message: 'No LEAPS candidate found' };

    // Use ask for limit price (we are buying)
    const limitPrice = candidate.ask;
    // Calculate contracts: floor(targetValue / (ask * 100))
    const contracts = Math.floor(targetDollarValue / (limitPrice * 100));

    if (contracts < 1) {
        return {
            action: 'error',
            message: `Insufficient allocation ($${targetDollarValue.toFixed(0)}) for 1 contract at $${(limitPrice*100).toFixed(0)}`
        };
    }

    const order: any = {
        timeInForce: 'Day',
        orderType: 'Limit',
        price: limitPrice,
        priceEffect: 'Debit',
        legs: [{
            instrumentType: 'Equity Option',
            symbol: candidate.occSymbol,
            quantity: contracts,
            action: 'Buy to Open',
        }],
    };

    const resp = await submitOrder(accessToken, accountNumber, order);

    const newState: LeapsState = {
        userId, accountNumber,
        occSymbol: candidate.occSymbol,
        underlyingSymbol: underlying,
        strikePrice: candidate.strikePrice,
        expirationDate: candidate.expirationDate,
        daysToExpirationAtOpen: candidate.daysToExpiration,
        contracts,
        openedAt: new Date().toISOString(),
        openCostPerContract: limitPrice * 100,
    };
    await setLeapsState(userId, accountNumber, newState);

    return {
        action: 'buy_to_open',
        orderId: resp.orderId,
        message: `Bought ${contracts} LEAPS contracts of ${candidate.occSymbol} at $${limitPrice.toFixed(2)}`,
        newState,
    };
}

// ─── Helper: Roll LEAPS (Sell old + Buy new in one multi-leg order) ────────

async function rollLeaps(
    accessToken: string, accountNumber: string, userId: string,
    currentState: LeapsState, underlying: string,
    underlyingPrice: number, targetDollarValue: number
): Promise<LeapsExecutionResult> {
    console.log(`🔄 Rolling LEAPS: ${currentState.occSymbol} → new contract`);

    const newCandidate = await getLeapsCandidate(accessToken, underlying, underlyingPrice);
    if (!newCandidate) return { action: 'error', message: 'No new LEAPS candidate found for roll' };

    const oldQuote = await getOptionQuote(accessToken, currentState.occSymbol);
    if (!oldQuote) return { action: 'error', message: `Cannot quote old LEAPS: ${currentState.occSymbol}` };

    // Net debit of roll = new ask - old bid (we receive old bid, pay new ask)
    const netDebit = newCandidate.ask - oldQuote.bid;
    const contracts = currentState.contracts; // Keep same size for the roll, rebalance will happen next day if needed

    // Single multi-leg order: Sell to Close old + Buy to Open new
    const order: any = {
        timeInForce: 'Day',
        orderType: 'Limit',
        price: Math.abs(netDebit),
        priceEffect: netDebit > 0 ? 'Debit' : 'Credit',
        legs: [
            {
                instrumentType: 'Equity Option',
                symbol: currentState.occSymbol,
                quantity: contracts,
                action: 'Sell to Close',
            },
            {
                instrumentType: 'Equity Option',
                symbol: newCandidate.occSymbol,
                quantity: contracts,
                action: 'Buy to Open',
            },
        ],
    };

    const resp = await submitOrder(accessToken, accountNumber, order);

    const newState: LeapsState = {
        userId, accountNumber,
        occSymbol: newCandidate.occSymbol,
        underlyingSymbol: underlying,
        strikePrice: newCandidate.strikePrice,
        expirationDate: newCandidate.expirationDate,
        daysToExpirationAtOpen: newCandidate.daysToExpiration,
        contracts,
        openedAt: new Date().toISOString(),
        openCostPerContract: newCandidate.ask * 100,
    };
    await setLeapsState(userId, accountNumber, newState);

    return {
        action: 'roll',
        orderId: resp.orderId,
        message: `Rolled ${contracts}x ${currentState.occSymbol} → ${newCandidate.occSymbol}, net debit $${netDebit.toFixed(2)}/contract`,
        newState,
    };
}

// ─── Helper: Rebalance contract count ─────────────────────────────────────

async function rebalanceLeaps(
    accessToken: string, accountNumber: string, userId: string,
    currentState: LeapsState, currentQuote: { bid: number; ask: number; mid: number },
    targetDollarValue: number
): Promise<LeapsExecutionResult> {
    const targetContracts = Math.floor(targetDollarValue / (currentQuote.ask * 100));
    const delta = targetContracts - currentState.contracts;

    if (delta === 0) return { action: 'hold', message: 'Contract count unchanged.' };

    const isBuy = delta > 0;
    const qty = Math.abs(delta);
    const limitPrice = isBuy ? currentQuote.ask : currentQuote.bid;

    const order: any = {
        timeInForce: 'Day',
        orderType: 'Limit',
        price: limitPrice,
        priceEffect: isBuy ? 'Debit' : 'Credit',
        legs: [{
            instrumentType: 'Equity Option',
            symbol: currentState.occSymbol,
            quantity: qty,
            action: isBuy ? 'Buy to Open' : 'Sell to Close',
        }],
    };

    const resp = await submitOrder(accessToken, accountNumber, order);

    const newState: LeapsState = { ...currentState, contracts: targetContracts };
    await setLeapsState(userId, accountNumber, newState);

    return {
        action: 'rebalance',
        orderId: resp.orderId,
        message: `${isBuy ? 'Bought' : 'Sold'} ${qty} contracts of ${currentState.occSymbol}`,
        newState,
    };
}

// ─── Helper: Sell to Close all LEAPS ──────────────────────────────────────

async function sellLeapsToClose(
    accessToken: string, accountNumber: string, userId: string,
    currentState: LeapsState
): Promise<LeapsExecutionResult> {
    const quote = await getOptionQuote(accessToken, currentState.occSymbol);
    const limitPrice = quote?.bid ?? 0;

    if (limitPrice <= 0) {
        await clearLeapsState(userId, accountNumber);
        return { action: 'error', message: `Cannot close LEAPS — no bid quote for ${currentState.occSymbol}` };
    }

    const order: any = {
        timeInForce: 'Day',
        orderType: 'Limit',
        price: limitPrice,
        priceEffect: 'Credit',
        legs: [{
            instrumentType: 'Equity Option',
            symbol: currentState.occSymbol,
            quantity: currentState.contracts,
            action: 'Sell to Close',
        }],
    };

    const resp = await submitOrder(accessToken, accountNumber, order);
    await clearLeapsState(userId, accountNumber);

    return {
        action: 'sell_to_close',
        orderId: resp.orderId,
        message: `Closed ${currentState.contracts} LEAPS contracts of ${currentState.occSymbol} at bid $${limitPrice.toFixed(2)}`,
    };
}
