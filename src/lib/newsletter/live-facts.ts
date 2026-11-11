/** Facts for the free weekly issue, shared by the invitation emails and the website issue page (cached 30 minutes). */
import { SAMPLE_FACTS, type IssueFacts } from '@/lib/outreach/copy-seq7';
import { etParts } from '@/lib/outreach/sender';

let factsCache: { at: number; facts: IssueFacts } | null = null;
export async function liveFacts(now: Date): Promise<IssueFacts> {
    if (factsCache && Date.now() - factsCache.at < 30 * 60_000) return factsCache.facts;
    const et = etParts(now);
    const monday = new Date(Date.parse(`${et.date}T12:00:00Z`) - ((et.dow + 6) % 7) * 86_400_000);
    const weekLabel = `Week of ${monday.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })}`;
    let regime = 'not available';
    try {
        const { buildFacts } = await import('@/lib/briefing/facts');
        const { previousMarketDay } = await import('@/lib/briefing/calendar');
        // Use the newest verified model run: today's, or the last market day before it (morning, weekends, holidays).
        let day = et.date;
        for (let i = 0; i < 5 && regime === 'not available'; i++) {
            const run = await buildFacts(day);
            const def = run.strategies.find((x) => x.strategy === 'TQQQ_TURBOCORE_PRO');
            if (def && def.run_verified && def.regime) regime = String(def.regime);
            else day = previousMarketDay(day);
        }
    } catch { /* keep not available */ }
    const facts: IssueFacts = {
        weekLabel, regime, trend: null, trendChanged: null, defensive: [], leaps: SAMPLE_FACTS.leaps,
        readout: 'Each risk level has its own published allocation from the latest model run. The allocation score helps set exposure. It is not a probability of any outcome.', sample: false,
    };
    factsCache = { at: Date.now(), facts };
    return facts;
}

