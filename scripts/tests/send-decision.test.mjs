// Run: npx tsc src/lib/newsletter/send-decision.ts --outDir /tmp/sd --module commonjs --target es2020 && node scripts/tests/send-decision.test.mjs
import { createRequire } from 'module';
import assert from 'assert';
const { decideNext } = createRequire(import.meta.url)('/tmp/sd/send-decision.js');
const s = { cadence_days: 2, max_attempts: 5 };
const now = new Date('2026-10-01T14:00:00Z');
const h = (o) => ({ lastCompleted: 0, lastCompletedAt: null, inFlight: false, failedAttemptsNext: 0, ...o });
const hoursAgo = (n) => new Date(now.getTime() - n * 3600_000);

// new address -> issue 1 now
assert.deepStrictEqual(decideNext(h({}), s, 8, now), { action: 'send', issue: 1, attempt: 1 });
// mid sequence, 49h after last -> next issue
assert.deepStrictEqual(decideNext(h({ lastCompleted: 1, lastCompletedAt: hoursAgo(49) }), s, 8, now), { action: 'send', issue: 2, attempt: 1 });
// 46h after last (inside 3h tolerance) -> send
assert.strictEqual(decideNext(h({ lastCompleted: 2, lastCompletedAt: hoursAgo(46) }), s, 8, now).action, 'send');
// 40h after last -> not due
assert.deepStrictEqual(decideNext(h({ lastCompleted: 2, lastCompletedAt: hoursAgo(40) }), s, 8, now), { action: 'wait', reason: 'not_due' });
// in flight -> wait
assert.deepStrictEqual(decideNext(h({ inFlight: true }), s, 8, now), { action: 'wait', reason: 'in_flight' });
// final issue completed -> done
assert.deepStrictEqual(decideNext(h({ lastCompleted: 8, lastCompletedAt: hoursAgo(100) }), s, 8, now), { action: 'done', reason: 'sequence_complete' });
// retry after failure keeps the same issue, attempt increments
assert.deepStrictEqual(decideNext(h({ failedAttemptsNext: 2 }), s, 8, now), { action: 'send', issue: 1, attempt: 3 });
// too many failures -> flagged, not sent
assert.deepStrictEqual(decideNext(h({ failedAttemptsNext: 5 }), s, 8, now), { action: 'wait', reason: 'max_attempts' });
// cadence is configurable
assert.strictEqual(decideNext(h({ lastCompleted: 1, lastCompletedAt: hoursAgo(49) }), { ...s, cadence_days: 7 }, 8, now).action, 'wait');
console.log('send-decision: all tests passed');
