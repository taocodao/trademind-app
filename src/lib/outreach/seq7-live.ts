/**
 * Live sender for the seven-email sequence (retail investors and advisers).
 *
 * Steps 21 to 27 are emails 1 to 7 (days 0, 7, 14, 21, 28, 35, 42 after the first). Seed steps start at 100000 and
 * encode the day, the domain and the email number, so a seed can repeat across days.
 *
 * Retail: ramp 200, +50 a day, cap 2000, window 9:00 AM to 11:00 PM ET every day. Advisers (wave 'ria'): ramp 100,
 * +25 a day, cap 1000, window 9:00 AM to 6:00 PM ET on business days. Both are also limited by each sending domain's own
 * warm-up cap. Each active domain sends one randomly chosen email a day to the test inbox around 9:00 AM ET.
 */
import { randomInt, randomBytes } from 'crypto';
import { query } from '@/lib/db';
import { MAILING_ADDRESS } from '@/lib/newsletter/email';
import { BASE_URL, CAMPAIGN, getSettings } from './db';
import { sendMail, transportKeyPresent, type Transport } from './transport';
import { renderSeq7, SAMPLE_FACTS, type IssueFacts } from './copy-seq7';
import { etParts, zonedInstant, allocateBudget, activeDomains, isBusinessDay } from './sender';

const ET = 'America/New_York';
const SEED_TO = 'testtrademind@gmail.com';
export const SEQ7_FIRST = 21;
const DAYS = [0, 7, 14, 21, 28, 35, 42];
const SEED_BASE = 100000;

export const isSeq7Row = (step: number): boolean => (step >= 21 && step <= 27) || step >= SEED_BASE;
export function seq7Active(s: Record<string, string>, now = new Date()): boolean {
    const t = s.copy_seq7_start ? Date.parse(s.copy_seq7_start) : NaN;
    return Number.isFinite(t) && now.getTime() >= t;
}
function riaDomains(s: Record<string, string>): Set<string> {
    return new Set(String(s.ria_domains || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
}
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
const dstr = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

/** Whether a queued row may send now. Seeds: 9:00 AM to 11:00 PM ET any day. Retail: same. Advisers: 9:00 AM to 6:00 PM ET on business days. */
export async function seq7WindowOpen(row: { step: number; domain: string }, now: Date): Promise<boolean> {
    const s = await getSettings();
    const et = etParts(now);
    const mins = et.hour * 60 + et.minute;
    const isSeed = row.step >= SEED_BASE;
    const ria = riaDomains(s).has(row.domain.toLowerCase()) && !isSeed;
    if (ria) return isBusinessDay(et.date, et.dow) && mins >= 9 * 60 && mins < 18 * 60;
    return mins >= 9 * 60 && mins < 23 * 60;
}

const BLOCKED = `'unsubscribed','bounced','complained','subscribed','confirmed','monthly','checked_in','snoozed'`;
const ELIGIBLE = `
    c.wave <> 'seed' AND ((c.wave = 'ria') = $1::boolean)
    AND c.status NOT IN (${BLOCKED})
    AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
    AND NOT EXISTS (SELECT 1 FROM newsletter_subscribers sub WHERE sub.status IN ('confirmed','pending') AND sub.email IN (c.email, COALESCE(c.subscriber_email, c.email)))
    AND NOT EXISTS (SELECT 1 FROM program_application pa WHERE pa.email_norm = LOWER(c.email))
    AND NOT EXISTS (SELECT 1 FROM program_participant pp WHERE pp.email_norm = LOWER(c.email))`;

async function ensureTables(): Promise<void> {
    await query(`CREATE TABLE IF NOT EXISTS outreach_plan_seq7 (
        plan_date DATE NOT NULL, audience TEXT NOT NULL, day_index INTEGER NOT NULL, budget INTEGER NOT NULL, planned INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (plan_date, audience))`);
}

async function planAudience(aud: 'retail' | 'ria', now: Date, s: Record<string, string>): Promise<Record<string, unknown> | null> {
    const et = etParts(now);
    const ria = aud === 'ria';
    if (ria && !isBusinessDay(et.date, et.dow)) return null;
    const endAt = zonedInstant(et.date, ria ? '18:00' : '23:00', ET).getTime();
    const startAt = Math.max(zonedInstant(et.date, '09:00', ET).getTime(), now.getTime() + 2 * 60_000);
    if (startAt >= endAt - 10 * 60_000) return null; // window nearly over; start tomorrow
    const claimIdx = Number((await query(`SELECT COUNT(*)::int AS n FROM outreach_plan_seq7 WHERE audience = $1`, [aud])).rows[0].n) + 1;
    const pre = ria ? 'ria_' : '';
    const budget = Math.min(Number(s[`${pre}ramp_start`] || (ria ? 100 : 200)) + Number(s[`${pre}ramp_step`] || (ria ? 25 : 50)) * (claimIdx - 1), Number(s[`${pre}ramp_cap`] || (ria ? 1000 : 2000)));
    const claim = await query(`INSERT INTO outreach_plan_seq7 (plan_date, audience, day_index, budget) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING plan_date`, [et.date, aud, claimIdx, budget]);
    if (!claim.rowCount) return null;
    try {
        const rd = riaDomains(s);
        const doms = (await activeDomains(et.date)).filter((d) => rd.has(d.domain.toLowerCase()) === ria);
        if (!doms.length) return { audience: aud, planned: 0, budget, reason: 'no active domains' };
        const cap = allocateBudget(doms, budget);
        const used = new Map<string, number>();
        const room = (d: string) => (cap.get(d) ?? 0) - (used.get(d) ?? 0);
        const best = () => doms.map((d) => d.domain).sort((a, b) => room(b) - room(a))[0];
        const picks: { token: string; tz: string; domain: string; step: number }[] = [];

        // Follow-ups: emails 2 to 7 on the schedule, at least 4 days after the last email.
        const fu = await query(`
            SELECT c.token, c.tz, s1.domain, (s1.sent_at AT TIME ZONE 'America/New_York')::date AS first_day,
                   COALESCE((SELECT array_agg(x.step) FROM outreach_sends x WHERE x.token = c.token AND x.step BETWEEN 21 AND 27), '{}') AS sent_steps,
                   COALESCE((SELECT array_agg(q.step) FROM outreach_queue q WHERE q.token = c.token AND q.state = 'pending' AND q.step BETWEEN 21 AND 27), '{}') AS queued,
                   (SELECT MAX(x.sent_at AT TIME ZONE 'America/New_York')::date FROM outreach_sends x WHERE x.token = c.token AND x.step < 100) AS last_day
            FROM outreach_contacts c
            JOIN outreach_sends s1 ON s1.token = c.token AND s1.step = 21 AND s1.status IN ('sent','delivered')
            WHERE ${ELIGIBLE}
            ORDER BY s1.sent_at ASC LIMIT 8000`, [ria]);
        const fuCap = Math.floor(budget * 0.6);
        for (const r of fu.rows) {
            if (picks.length >= fuCap) break;
            const sent = new Set<number>(r.sent_steps), queued = new Set<number>(r.queued);
            const next = [22, 23, 24, 25, 26, 27].find((st) => !sent.has(st));
            if (next === undefined || queued.has(next)) continue;
            if (dayDiff(et.date, dstr(r.first_day)) < DAYS[next - 21]) continue;
            if (r.last_day && dayDiff(et.date, dstr(r.last_day)) < 4) continue;
            const d = cap.has(String(r.domain)) && room(String(r.domain)) > 0 ? String(r.domain) : best();
            if (room(d) <= 0) continue;
            picks.push({ token: r.token, tz: r.tz, domain: d, step: next }); used.set(d, (used.get(d) ?? 0) + 1);
        }

        // First emails: people never emailed come first. People emailed before the new sequence start fresh afterwards.
        const want = budget - picks.length;
        if (want > 0) {
            const inv = await query(`
                SELECT c.token, c.tz FROM outreach_contacts c
                WHERE ${ELIGIBLE} AND c.status IN ('pending','sent','clicked')
                  AND NOT EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step = 21)
                  AND NOT EXISTS (SELECT 1 FROM outreach_queue q WHERE q.token = c.token AND q.step = 21)
                  AND NOT EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step < 100 AND x.sent_at > NOW() - INTERVAL '4 days')
                ORDER BY (c.status = 'pending') DESC, md5(c.token) LIMIT $2`, [ria, want]);
            for (const r of inv.rows) {
                if (picks.length >= budget) break;
                const d = best();
                if (room(d) <= 0) break;
                picks.push({ token: r.token, tz: r.tz, domain: d, step: 21 }); used.set(d, (used.get(d) ?? 0) + 1);
            }
        }
        for (const p of picks) {
            // Never before 9:00 AM local for the reader; spread evenly through the rest of the window.
            const localStart = ria ? 0 : zonedInstant(et.date, '09:00', p.tz || ET).getTime();
            const st = Math.max(startAt, localStart);
            const span = Math.max(Math.floor((endAt - st) / 1000), 60);
            const at = st + randomInt(0, span) * 1000;
            await query(`INSERT INTO outreach_queue (plan_date, token, step, domain, scheduled_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (token, step) DO NOTHING`,
                [et.date, p.token, p.step, p.domain, new Date(Math.min(at, endAt))]);
        }
        await query(`UPDATE outreach_plan_seq7 SET planned = $3 WHERE plan_date = $1 AND audience = $2`, [et.date, aud, picks.length]);
        return { audience: aud, planned: picks.length, budget, dayIndex: claimIdx };
    } catch (err) {
        await query(`DELETE FROM outreach_queue WHERE plan_date = $1 AND state = 'pending' AND step BETWEEN 21 AND 27 AND domain = ANY($2::text[])`, [et.date, (await activeDomains(et.date)).filter((d) => riaDomains(s).has(d.domain.toLowerCase()) === ria).map((d) => d.domain)]);
        await query(`DELETE FROM outreach_plan_seq7 WHERE plan_date = $1 AND audience = $2`, [et.date, aud]);
        throw err;
    }
}

/** One randomly chosen email per active domain per day, to the test inbox, starting around 9:00 AM ET. */
async function planSeeds(now: Date, s: Record<string, string>): Promise<Record<string, unknown> | null> {
    const et = etParts(now);
    if (et.hour < 5) return null;
    const claim = await query(`INSERT INTO outreach_plan_seq7 (plan_date, audience, day_index, budget) VALUES ($1,'seed',1,0) ON CONFLICT DO NOTHING RETURNING plan_date`, [et.date]);
    if (!claim.rowCount) return null;
    try {
        let sr = await query(`SELECT token FROM outreach_contacts WHERE email = $1 AND wave = 'seed'`, [SEED_TO]);
        if (!sr.rows[0]) {
            const token = randomBytes(8).toString('base64url').slice(0, 10);
            await query(`INSERT INTO outreach_contacts (token, email, first_name, wave, status, template, tz, segment) VALUES ($1,$2,'Eric','seed','pending','S7','America/New_York','seed') ON CONFLICT DO NOTHING`, [token, SEED_TO]);
            sr = await query(`SELECT token FROM outreach_contacts WHERE email = $1 AND wave = 'seed'`, [SEED_TO]);
        }
        const token = sr.rows[0].token as string;
        const doms = await activeDomains(et.date);
        const epochDay = Math.floor(Date.parse(et.date) / 86_400_000);
        const nowMs = now.getTime();
        let i = 0;
        for (const d of doms) {
            const n = randomInt(1, 8);
            const step = SEED_BASE + epochDay * 100 + i * 10 + n;
            const base = zonedInstant(et.date, '09:00', ET).getTime();
            let at = base + randomInt(0, 25) * 60_000;
            if (at < nowMs) at = nowMs + randomInt(1, 10) * 60_000;
            await query(`INSERT INTO outreach_queue (plan_date, token, step, domain, scheduled_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (token, step) DO NOTHING`, [et.date, token, step, d.domain, new Date(at)]);
            i++;
        }
        return { seeds: doms.length };
    } catch (err) {
        await query(`DELETE FROM outreach_plan_seq7 WHERE plan_date = $1 AND audience = 'seed'`, [et.date]);
        throw err;
    }
}

export async function planSeq7(now: Date, s: Record<string, string>): Promise<Record<string, unknown> | null> {
    await ensureTables();
    const out: Record<string, unknown> = {};
    out.retail = await planAudience('retail', now, s);
    out.ria = await planAudience('ria', now, s);
    out.seeds = await planSeeds(now, s);
    const planned = Number((out.retail as any)?.planned ?? 0) + Number((out.ria as any)?.planned ?? 0);
    return { planned, budget: Number((out.retail as any)?.budget ?? 0), dayIndex: Number((out.retail as any)?.dayIndex ?? 0), detail: out } as unknown as Record<string, unknown>;
}

// ---------- weekly issue facts for the first email ----------
let factsCache: { at: number; facts: IssueFacts } | null = null;
async function liveFacts(now: Date): Promise<IssueFacts> {
    if (factsCache && Date.now() - factsCache.at < 30 * 60_000) return factsCache.facts;
    const et = etParts(now);
    const monday = new Date(Date.parse(`${et.date}T12:00:00Z`) - ((et.dow + 6) % 7) * 86_400_000);
    const weekLabel = `Week of ${monday.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })}`;
    let regime = 'not available';
    try {
        const { buildFacts } = await import('@/lib/briefing/facts');
        const run = await buildFacts(et.date);
        const def = run.strategies.find((x) => x.strategy === 'TQQQ_TURBOCORE_PRO');
        if (def && def.run_verified && def.regime) regime = String(def.regime);
    } catch { /* keep not available */ }
    const facts: IssueFacts = {
        weekLabel, regime, trend: null, trendChanged: null, defensive: [], leaps: SAMPLE_FACTS.leaps,
        readout: 'Each risk level has its own published allocation from the latest model run. The allocation score helps set exposure. It is not a probability of any outcome.', sample: false,
    };
    factsCache = { at: Date.now(), facts };
    return facts;
}

export async function sendSeq7(row: { id: number; token: string; step: number; domain: string }, s: Record<string, string>, c: any, fromLocal: string, transport: Transport): Promise<'sent' | 'skipped' | 'failed'> {
    const skip = async (note: string) => { await query(`UPDATE outreach_queue SET state = 'skipped', note = $2 WHERE id = $1`, [row.id, note]); return 'skipped' as const; };
    const isSeed = c.wave === 'seed';
    const rd = riaDomains(s);
    const ria = isSeed ? rd.has(row.domain.toLowerCase()) : c.wave === 'ria';
    const n = isSeed ? (row.step % 10 >= 1 && row.step % 10 <= 7 ? row.step % 10 : 1) : row.step - 20;
    if (!isSeed) {
        if (['unsubscribed', 'bounced', 'complained', 'subscribed', 'confirmed', 'monthly', 'checked_in', 'snoozed'].includes(c.status)) return skip(`status ${c.status}`);
        if ((await query(`SELECT 1 FROM newsletter_suppression WHERE email = $1`, [c.email])).rowCount) return skip('suppressed');
        const sub = await query(`SELECT 1 FROM newsletter_subscribers WHERE status IN ('confirmed','pending') AND email = ANY($1::text[]) LIMIT 1`, [[String(c.email).toLowerCase(), String(c.subscriber_email ?? '').toLowerCase()].filter(Boolean)]);
        if (sub.rowCount) return skip('already subscribed');
        const applied = await query(`SELECT 1 FROM program_application WHERE email_norm = $1 UNION ALL SELECT 1 FROM program_participant WHERE email_norm = $1 LIMIT 1`, [String(c.email).toLowerCase()]).catch(() => ({ rowCount: 0 }));
        if (applied.rowCount) return skip('applied to program');
        if (ria && c.wave !== 'ria') return skip('audience mismatch');
    }
    const facts = await liveFacts(new Date());
    const msg = renderSeq7({ token: c.token, firstName: c.first_name, baseUrl: BASE_URL, mailingAddress: MAILING_ADDRESS, step: n, n, facts, audience: ria ? 'ria' : 'retail' });
    if (!transportKeyPresent(transport)) return 'failed';
    const from = `${s.from_display || 'Eric Huang'} <${fromLocal}@${row.domain}>`;
    let res;
    try {
        res = await sendMail({
            transport, from, to: isSeed ? SEED_TO : c.email, replyTo: s.reply_to || undefined, subject: msg.subject, text: msg.text, html: msg.html,
            headers: s.list_unsub_header === 'false' ? undefined : { 'List-Unsubscribe': `<${msg.unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
            token: row.token, step: row.step, campaign: CAMPAIGN, idempotencyKey: `outreach-${row.token}-${row.step}`,
        });
    } catch (e) {
        await query(`UPDATE outreach_queue SET note = $2 WHERE id = $1`, [row.id, `network: ${(e as Error).message}`.slice(0, 200)]);
        return 'failed';
    }
    if (!res.ok) {
        await query(`UPDATE outreach_queue SET state = $2, note = $3 WHERE id = $1`, [row.id, res.permanent ? 'failed' : 'pending', `${transport} ${res.status}: ${res.body}`]);
        return 'failed';
    }
    await query(`INSERT INTO outreach_sends (token, step, template, domain, from_addr, message_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (token, step) DO NOTHING`,
        [row.token, row.step, `S7${ria ? 'R' : ''}_${n}`, row.domain, from, res.id ?? null]);
    await query(`UPDATE outreach_queue SET state = 'sent' WHERE id = $1`, [row.id]);
    if (!isSeed) await query(`UPDATE outreach_contacts SET status = 'sent', updated_at = NOW() WHERE token = $1 AND status = 'pending'`, [row.token]);
    return 'sent';
}
