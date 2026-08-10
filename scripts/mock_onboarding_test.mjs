/**
 * Mock end-to-end test of the TradeMind named-account onboarding + signal flow.
 *
 * Simulates the production logic with an in-memory ledger (no DB, no network):
 *   1. Onboard: create a named account (strategy + risk level + principal)
 *   2. Phase assignment from initial NLV
 *   3. Signal fan-out: tier selection + NLV sizing + phase cap + execution
 *   4. Deposit-triggered promotion (skip-level)
 *   5. Drawdown emergency demotion
 *   6. Hysteresis around a threshold
 *
 * The phase state machine and sizing math here mirror:
 *   - app:  src/lib/account-phase.ts, src/lib/account-executor.ts
 *   - tier: src/lib/signal-fanout.ts selectTier
 */

// ─── Phase engine (mirrors src/lib/account-phase.ts) ─────────────────────────
const PHASES = [
    { name: 'SEED', navMin: 0, navMax: 14999, maxPositionPct: 0.95, maxPositions: 1 },
    { name: 'GROWTH', navMin: 15000, navMax: 29999, maxPositionPct: 0.45, maxPositions: 2 },
    { name: 'TARGET', navMin: 30000, navMax: null, maxPositionPct: 0.33, maxPositions: 3 },
];
const DEMOTION_BUFFER_PCT = 0.05, MIN_DWELL_DAYS = 5, EMERGENCY_DEMOTION_DD_PCT = 0.15;
const phaseForNlv = (nlv) => PHASES.find(p => nlv >= p.navMin && (p.navMax === null || nlv <= p.navMax)) || PHASES[0];
const rank = (n) => PHASES.findIndex(p => p.name === n);

// ─── In-memory account store ─────────────────────────────────────────────────
let _id = 0;
const accounts = new Map();

function createAccount(userId, name, strategy, riskLevel, initialPrincipal) {
    const acct = {
        id: ++_id, userId, name, strategy: strategy.toUpperCase(), riskLevel,
        initialPrincipal, cash: initialPrincipal, positions: {}, // symbol -> {qty, avgPrice}
        phase: null, phaseEnteredDay: null, transitions: [], activities: [],
    };
    acct.activities.push({ type: 'deposit', amount: initialPrincipal, note: 'Initial principal' });
    accounts.set(acct.id, acct);
    return acct;
}

function nlv(acct, prices) {
    let v = acct.cash;
    for (const [sym, p] of Object.entries(acct.positions)) v += p.qty * (prices[sym] ?? p.avgPrice);
    return v;
}

function evaluatePhase(acct, nlvNow, priorNlv, day) {
    const target = phaseForNlv(nlvNow);
    if (!acct.phase) {
        recordTransition(acct, 'NONE', target.name, nlvNow, 'INITIAL_ASSIGNMENT', day);
        return { phase: target, transitioned: true, from: null, reason: 'INITIAL_ASSIGNMENT' };
    }
    const cur = acct.phase;
    if (priorNlv && priorNlv > 0) {
        const dd = (priorNlv - nlvNow) / priorNlv;
        if (dd >= EMERGENCY_DEMOTION_DD_PCT && target.name !== cur) {
            recordTransition(acct, cur, target.name, nlvNow, `EMERGENCY_DEMOTION_DD_${(dd*100).toFixed(1)}%`, day);
            return { phase: target, transitioned: true, from: cur, reason: 'EMERGENCY_DEMOTION' };
        }
    }
    if (target.name === cur) return { phase: PHASES[rank(cur)], transitioned: false };
    const dwell = day - acct.phaseEnteredDay;
    if (rank(target.name) > rank(cur)) {
        if (dwell >= MIN_DWELL_DAYS) {
            recordTransition(acct, cur, target.name, nlvNow, 'PROMOTION', day);
            return { phase: target, transitioned: true, from: cur, reason: 'PROMOTION' };
        }
        return { phase: PHASES[rank(cur)], transitioned: false };
    }
    const bufferedFloor = PHASES[rank(cur)].navMin * (1 - DEMOTION_BUFFER_PCT);
    if (nlvNow < bufferedFloor && dwell >= MIN_DWELL_DAYS) {
        recordTransition(acct, cur, target.name, nlvNow, 'DEMOTION_HYSTERESIS_CONFIRMED', day);
        return { phase: target, transitioned: true, from: cur, reason: 'DEMOTION' };
    }
    return { phase: PHASES[rank(cur)], transitioned: false };
}

function recordTransition(acct, from, to, nlvNow, reason, day) {
    acct.transitions.push({ from, to, nlv: nlvNow, reason, day });
    acct.phase = to;
    acct.phaseEnteredDay = day;
}

// ─── Signal fan-out (mirrors selectTier + generateAccountOrders) ─────────────
function selectTier(signalData, riskLevel) {
    const tiers = signalData.tiers;
    if (!tiers || !tiers[riskLevel]) return signalData.target_allocation || {};
    return tiers[riskLevel].target_allocation || {};
}

function generateAndExecute(acct, signal, prices, day, priorNlv) {
    const alloc = selectTier(signal, acct.riskLevel);          // tier = entry strictness
    const nlvNow = nlv(acct, prices);                           // current position + cash
    const pe = evaluatePhase(acct, nlvNow, priorNlv, day);      // phase = capital scaling
    const cap = pe.phase.maxPositionPct;

    const orders = [];
    for (const [symbol, targetPct] of Object.entries(alloc)) {
        if (!(targetPct > 0)) continue;
        const px = prices[symbol];
        if (!px || px <= 0) continue;
        const effectivePct = Math.min(targetPct, cap);          // phase caps sizing
        const targetQty = Math.floor((nlvNow * effectivePct) / px);
        const curQty = acct.positions[symbol]?.qty ?? 0;
        const delta = targetQty - curQty;
        if (Math.abs(delta) < 1) continue;
        orders.push({ symbol, action: delta > 0 ? 'buy' : 'sell', qty: Math.abs(delta), px, effectivePct });
    }
    // sells first to free cash, then buys
    orders.sort((a, b) => (a.action === 'sell' && b.action !== 'sell' ? -1 : 1));
    for (const o of orders) {
        const cost = o.qty * o.px;
        if (o.action === 'buy') {
            if (cost > acct.cash) continue; // cash constraint
            acct.cash -= cost;
            const cur = acct.positions[o.symbol] || { qty: 0, avgPrice: 0 };
            const newQty = cur.qty + o.qty;
            acct.positions[o.symbol] = { qty: newQty, avgPrice: (cur.avgPrice * cur.qty + cost) / newQty };
        } else {
            acct.cash += cost;
            const cur = acct.positions[o.symbol];
            if (cur) { cur.qty -= o.qty; if (cur.qty <= 0) delete acct.positions[o.symbol]; }
        }
        acct.activities.push({ type: o.action, symbol: o.symbol, qty: o.qty, price: o.px, source: 'signal' });
    }
    return { orders, phase: pe.phase.name, cap, transitioned: pe.transitioned, from: pe.from, reason: pe.reason, nlv: nlvNow };
}

// ─── Mock scenario ────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function check(label, cond, extra = '') {
    if (cond) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ FAIL: ${label} ${extra}`); }
}

const PRICES = { QQQ: 500, TQQQ: 80, SGOV: 100 };
const SIGNAL = {
    strategy: 'QQQ_LEAPS', regime: 'BULL_MODERATE', confidence: 0.62,
    tiers: {
        conservative: { target_allocation: { QQQ: 0.5, SGOV: 0.5 } },
        moderate:     { target_allocation: { QQQ: 0.8, SGOV: 0.2 } },
        aggressive:   { target_allocation: { QQQ: 1.0 } },
    },
};

console.log('\n=== STEP 1: Onboard — create named account ===');
const acct = createAccount('user_eric', 'My QQQ Account', 'QQQ_LEAPS', 'moderate', 8600);
check('account created with principal $8,600', acct.cash === 8600);
check('initial deposit activity recorded', acct.activities[0].type === 'deposit' && acct.activities[0].amount === 8600);
check('strategy uppercased', acct.strategy === 'QQQ_LEAPS');
check('risk level = moderate', acct.riskLevel === 'moderate');

console.log('\n=== STEP 2: First signal — initial phase assignment + sizing ===');
let r = generateAndExecute(acct, SIGNAL, PRICES, /*day*/0, /*priorNlv*/null);
check('phase assigned = SEED (NLV $8,600 < $15K)', r.phase === 'SEED');
check('initial assignment transition logged', acct.transitions[0].reason === 'INITIAL_ASSIGNMENT');
check('moderate tier selected (QQQ 0.8)', r.orders.some(o => o.symbol === 'QQQ'));
// SEED cap 0.95, moderate target 0.8 -> effective 0.8; QQQ qty = floor(8600*0.8/500)=13
const qqqOrder = r.orders.find(o => o.symbol === 'QQQ');
check('QQQ buy qty = 13 (NLV*0.8/500)', qqqOrder && qqqOrder.qty === 13, `got ${qqqOrder?.qty}`);
check('cash reduced by purchase', acct.cash < 8600);

console.log('\n=== STEP 3: Phase cap binds when tier target exceeds it ===');
// aggressive tier targets QQQ 1.0 but SEED cap is 0.95
const acct2 = createAccount('user_eric', 'AggressiveAcct', 'QQQ_LEAPS', 'aggressive', 8600);
let r2 = generateAndExecute(acct2, SIGNAL, PRICES, 0, null);
const q2 = r2.orders.find(o => o.symbol === 'QQQ');
// effective pct = min(1.0, 0.95)=0.95 -> floor(8600*0.95/500)=16
check('aggressive target 1.0 capped to 0.95 by SEED', q2 && q2.effectivePct === 0.95, `got ${q2?.effectivePct}`);
check('QQQ qty = 16 (8600*0.95/500)', q2 && q2.qty === 16, `got ${q2?.qty}`);

console.log('\n=== STEP 4: Deposit-triggered skip-level promotion (SEED -> TARGET) ===');
// Simulate a large deposit: cash jumps to $32,000 (deposit-triggered promotion path)
acct.cash = 32000; acct.positions = {}; // reset for clarity
acct.activities.push({ type: 'deposit', amount: 32000 - 8600, note: 'External capital' });
// dwell: phase entered day 0, now day 6 (>=5)
let r4 = generateAndExecute(acct, SIGNAL, PRICES, /*day*/6, /*priorNlv*/8600);
check('skip-level promotion SEED -> TARGET', r4.phase === 'TARGET' && r4.from === 'SEED', `got ${r4.phase} from ${r4.from}`);
check('promotion reason logged', acct.transitions.some(t => t.reason === 'PROMOTION'));
check('TARGET cap = 0.33', r4.cap === 0.33);

console.log('\n=== STEP 5: Emergency demotion on a sharp drawdown ===');
// NAV crashes 21% close-over-close: 32000 -> 25300 (GROWTH band)
acct.cash = 25300; acct.positions = {};
let r5 = generateAndExecute(acct, SIGNAL, PRICES, /*day*/7, /*priorNlv*/32000);
check('emergency demotion TARGET -> GROWTH on 21% DD', r5.phase === 'GROWTH' && r5.reason === 'EMERGENCY_DEMOTION', `got ${r5.phase} ${r5.reason}`);
check('emergency transition logged', acct.transitions.some(t => t.reason.startsWith('EMERGENCY_DEMOTION')));

console.log('\n=== STEP 6: Hysteresis around the $15K boundary (pure phase logic, cash-only) ===');
// Cash-only account (no positions) so NLV == cash; isolates the phase state machine.
const h = createAccount('user_eric', 'HysteresisAcct', 'QQQ_LEAPS', 'moderate', 16000);
const FLAT = { strategy: 'QQQ_LEAPS', tiers: { moderate: { target_allocation: {} } } }; // no trades
let ha = generateAndExecute(h, FLAT, PRICES, /*day*/0, null);
check('init at $16K -> GROWTH', ha.phase === 'GROWTH');
h.cash = 14900;
let hb = generateAndExecute(h, FLAT, PRICES, 6, 16000);   // -6.9% -> no emergency; 14900 > 14250 floor -> hold
check('NAV 14900 holds GROWTH (above buffered floor 14250)', hb.phase === 'GROWTH', `got ${hb.phase}`);
h.cash = 15100;
let hc = generateAndExecute(h, FLAT, PRICES, 7, 14900);
check('NAV 15100 stays GROWTH (no flip)', hc.phase === 'GROWTH', `got ${hc.phase}`);
h.cash = 14800;
let hd = generateAndExecute(h, FLAT, PRICES, 8, 15100);
check('NAV 14800 still GROWTH (hysteresis)', hd.phase === 'GROWTH', `got ${hd.phase}`);
h.cash = 14000;
let he = generateAndExecute(h, FLAT, PRICES, 9, 14800);   // -5.4% -> no emergency; 14000 < 14250 + dwell ok -> demote
check('NAV 14000 demotes to SEED (below floor + dwell)', he.phase === 'SEED', `got ${he.phase}`);

console.log('\n=== Transition log (main account) ===');
for (const t of acct.transitions) console.log(`  day ${t.day}: ${t.from} -> ${t.to} @ $${t.nlv.toLocaleString()} (${t.reason})`);
console.log('=== Transition log (hysteresis account) ===');
for (const t of h.transitions) console.log(`  day ${t.day}: ${t.from} -> ${t.to} @ $${t.nlv.toLocaleString()} (${t.reason})`);

console.log(`\n${'='.repeat(50)}\nRESULT: ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
