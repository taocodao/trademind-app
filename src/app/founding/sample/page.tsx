import Link from 'next/link';

const QUIET = `MODEL INSTRUCTION

Nothing to do today. Both strategies hold their current model positions.

QQQ LEAPS: No change. Keep your current model position.
QQQ Defensive: No change. Keep your current model position.

Data as of October 23, 2026. The model runs at 3:00 PM Eastern.

CURRENT MODEL POSITION

QQQ LEAPS: see the public ledger, https://trademind.bot/live-record
QQQ Defensive, conservative level: SGOV 75%, QQQ 25%
QQQ Defensive, moderate level: QQQ 85%, SGOV 15%
QQQ Defensive, aggressive level: QQQ 100%

WHAT TO WATCH

- Market regime: BULL
- 200-day average gate: passed
- Short-term trend signal: positive
- Model confidence: 43%
- QQQ close: 704.83

CONTEXT. NOT AN ADDITIONAL INSTRUCTION.

The model reads the market regime as BULL with confidence of 43%, and 3 of 3 gates are satisfied. Confidence below the model threshold is a reason for patience, not a signal. Quiet days are normal for a rules based process, and a quiet day is the model working as designed.`;

const CHANGE = `MODEL INSTRUCTION

QQQ Defensive changed its model weights today. QQQ LEAPS holds its current position.

QQQ LEAPS: No change. Keep your current model position.
QQQ Defensive: Strategy change.
  Conservative level: move to SGOV 75%, QQQ 25% (was SGOV 70%, QQQ 30%)
  Moderate level: move to QQQ 85%, SGOV 15% (was SGOV 70%, QQQ 30%)
  Aggressive level: move to QQQ 100% (was SGOV 70%, QQQ 30%)

Data as of October 19, 2026. The model runs at 3:00 PM Eastern.`;

export default function Sample() {
    const box = 'mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-relaxed text-gray-200';
    return (
        <main className="mx-auto max-w-2xl px-5 py-12">
            <h1 className="text-3xl font-semibold">Sample daily briefing</h1>
            <p className="mt-4 text-gray-300">This is what a Research member receives each market day. The instruction block always comes first. Context is labeled as context and is never an extra instruction. Both samples use real model output from the dates shown. They are examples of format, not advice.</p>
            <h2 className="mt-8 text-lg font-semibold">A quiet day</h2>
            <pre className={box}>{QUIET}</pre>
            <h2 className="mt-8 text-lg font-semibold">A day the model changed its weights</h2>
            <pre className={box}>{CHANGE}</pre>
            <p className="mt-8 text-sm text-gray-400">Educational research, not investment advice. TradeMind never connects to a brokerage and never places orders. You enter every order yourself. Results shown on our site are simulated unless labeled otherwise, and simulated results are not live trading.</p>
            <p className="mt-6"><Link href="/founding" className="text-blue-300 underline">Apply to the founding program</Link></p>
        </main>
    );
}
