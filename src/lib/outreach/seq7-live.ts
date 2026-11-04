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
import { renderSeq7, SAMPLE_FACTS, stageForAge, isStageControl, STAGES, STAGE_HOURS, type IssueFacts, type Stage } from './copy-seq7';
import { renderRia, RIA_DAYS } from './copy-ria';
import { leanify } from './lean';
import { etParts, zonedInstant, allocateBudget, activeDomains, isBusinessDay } from './sender';

const ET = 'America/New_York';
const SEED_TO = 'testtrademind@gmail.com';
// Owner-controlled addresses: real subscribers or applicants who may still receive a production-path placement check.
const OWNER_TEST = new Set(['web3aistore1@gmail.com', 'web3aistore2@gmail.com', 'web3aistore3@gmail.com', 'web3aistore4@gmail.com', 'web3aistore@gmail.com', 'testtrademind@gmail.com', 'testtrademindnewsletter@gmail.com']);
const isOwnerTest = (email: string): boolean => OWNER_TEST.has(String(email).toLowerCase().replace(/\+[^@]*@/, '@'));
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
export async function seq7WindowOpen(row: { step: number; domain: string; token?: string }, now: Date): Promise<boolean> {
    const s = await getSettings();
    const et = etParts(now);
    const mins = et.hour * 60 + et.minute;
    const isSeed = row.step >= SEED_BASE;
    let ria = riaDomains(s).has(row.domain.toLowerCase()) && !isSeed;
    if (!isSeed && row.token) {
        const w = await query(`SELECT wave, email FROM outreach_contacts WHERE token = $1`, [row.token]);
        if (w.rows[0] && isOwnerTest(w.rows[0].email)) return true;
        if (w.rows[0]) ria = w.rows[0].wave === 'ria';
    }
    if (ria) return isBusinessDay(et.date, et.dow) && mins >= 9 * 60 && mins < 18 * 60;
    return mins >= 9 * 60 && mins < 23 * 60;
}

const BLOCKED = `'unsubscribed','bounced','complained','subscribed','confirmed','monthly','checked_in','snoozed'`;
const ELIGIBLE = `
    c.wave <> 'seed' AND c.token NOT LIKE 'dt%' AND c.token NOT LIKE 'prod%' AND ((c.wave = 'ria') = $1::boolean)
    AND c.status NOT IN (${BLOCKED})
    AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
    AND NOT EXISTS (SELECT 1 FROM newsletter_subscribers sub WHERE sub.status IN ('confirmed','pending') AND sub.email IN (c.email, COALESCE(c.subscriber_email, c.email)))
    AND NOT EXISTS (SELECT 1 FROM program_application pa WHERE pa.email_norm = LOWER(c.email))
    AND NOT EXISTS (SELECT 1 FROM program_participant pp WHERE pp.email_norm = LOWER(c.email))`;

async function ensureTables(): Promise<void> {
    await query(`CREATE TABLE IF NOT EXISTS outreach_plan_seq7 (
        plan_date DATE NOT NULL, audience TEXT NOT NULL, day_index INTEGER NOT NULL, budget INTEGER NOT NULL, planned INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (plan_date, audience))`);
    await query(`CREATE TABLE IF NOT EXISTS outreach_domain_counter (domain TEXT PRIMARY KEY, sent_total INTEGER NOT NULL DEFAULT 0, tests INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE TABLE IF NOT EXISTS outreach_test_copies (id SERIAL PRIMARY KEY, domain TEXT NOT NULL, sent_total INTEGER NOT NULL, source_token TEXT, step INTEGER, subject TEXT, ok BOOLEAN NOT NULL, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

// ---------- per-domain ramp (ramp_mode = 'perdomain') ----------
// Each active domain has its own daily target: day 1 = pd_start (60), then the previous target plus pd_step (20) plus a random 0 to pd_jitter (5),
// capped at pd_cap (700). A plan row 'dom:<domain>' is stored for every day the domain is active, so a paused domain resumes where it stopped and a
// new domain starts at day 1. A domain added or resumed mid-day is planned on the next five-minute tick, with no restart of the other domains.
const TEST_COPY_TO = 'ericyaohuang@gmail.com';
const TEST_COPY_EVERY = 50;
const TEST_COPY_UNSUB_TOKEN = 'dt20261101sp4'; // placement-test contact for ericyaohuang@gmail.com: its one-click unsubscribe affects no real contact

async function planPerDomain(now: Date, s: Record<string, string>): Promise<Record<string, unknown> | null> {
    const et = etParts(now);
    if (s.perdomain_start && et.date < s.perdomain_start) return { waiting: s.perdomain_start };
    const endAt = zonedInstant(et.date, '23:00', ET).getTime();
    const startAt = Math.max(zonedInstant(et.date, '09:00', ET).getTime(), now.getTime() + 2 * 60_000);
    if (startAt >= endAt - 10 * 60_000) return null; // window nearly over; start tomorrow
    const doms = await activeDomains(et.date);
    const rd = riaDomains(s); // adviser domains: business days only, 9:00 AM to 6:00 PM ET, adviser list and six-email weekly sequence
    const start = Number(s.pd_start || 60), step = Number(s.pd_step || 20), jitter = Number(s.pd_jitter || 5), cap = Number(s.pd_cap || 700);
    const out: Record<string, unknown>[] = [];
    for (const d of doms) {
        const ria = rd.has(d.domain.toLowerCase());
        if (ria && !isBusinessDay(et.date, et.dow)) continue; // adviser domains do not send on weekends or holidays, and the ramp does not advance
        const dEnd = ria ? zonedInstant(et.date, '18:00', ET).getTime() : endAt;
        if (startAt >= dEnd - 10 * 60_000) continue;
        const activeNames = doms.filter((x) => rd.has(x.domain.toLowerCase()) === ria).map((x) => x.domain);
        const aud = `dom:${d.domain}`;
        const prev = await query(`SELECT budget, day_index FROM outreach_plan_seq7 WHERE audience = $1 AND plan_date < $2 ORDER BY plan_date DESC LIMIT 1`, [aud, et.date]);
        let budget = prev.rows[0] ? Math.min(Number(prev.rows[0].budget) + step + randomInt(0, jitter + 1), cap) : start;
        if (prev.rows[0]) {
            // Results gate: hold the volume flat (no increase) when the last 14 days show 1% or more bounces, or any complaint.
            const h = await query(`SELECT COUNT(*) AS sent, COUNT(*) FILTER (WHERE status = 'bounced') AS bounced, COUNT(*) FILTER (WHERE complaint) AS complaints
                FROM outreach_sends WHERE domain = $1 AND sent_at > NOW() - INTERVAL '14 days' AND step < 100 AND token NOT LIKE 'dt%' AND token NOT LIKE 'prod%' AND token <> 'testcopy'`, [d.domain]);
            const hs = Number(h.rows[0].sent), hb = Number(h.rows[0].bounced), hc = Number(h.rows[0].complaints);
            if (hc > 0 || (hs >= 30 && hb / hs >= 0.01)) budget = Math.min(Number(prev.rows[0].budget), cap);
        }
        const idx = prev.rows[0] ? Number(prev.rows[0].day_index) + 1 : 1;
        const claim = await query(`INSERT INTO outreach_plan_seq7 (plan_date, audience, day_index, budget) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING plan_date`, [et.date, aud, idx, budget]);
        if (!claim.rowCount) continue;
        try {
            const picks: { token: string; tz: string; step: number }[] = [];
            // Follow-ups first (emails 2 to 7, at least 7 days after the first email on the schedule, at least 4 days after the last email).
            // This domain's own contacts, plus contacts whose first domain is no longer active. Keep 15% of the day for new contacts.
            const fu = await query(`
                SELECT c.token, c.tz, s1.domain,
                       (s1.sent_at AT TIME ZONE 'America/New_York')::date AS first_day,
                       COALESCE((SELECT array_agg(x.step) FROM outreach_sends x WHERE x.token = c.token AND x.step BETWEEN 21 AND 27), '{}') AS sent_steps,
                       COALESCE((SELECT array_agg(q.step) FROM outreach_queue q WHERE q.token = c.token AND q.state = 'pending' AND q.step BETWEEN 21 AND 27), '{}') AS queued,
                       (SELECT MAX(x.sent_at AT TIME ZONE 'America/New_York')::date FROM outreach_sends x WHERE x.token = c.token AND x.step < 100) AS last_day
                FROM outreach_contacts c
                JOIN outreach_sends s1 ON s1.token = c.token AND s1.step = 21 AND s1.status IN ('sent','delivered')
                WHERE ${ELIGIBLE} AND (s1.domain = $2 OR s1.domain <> ALL($3::text[]))
                ORDER BY s1.sent_at ASC LIMIT 8000`, [ria, d.domain, activeNames]);
            const fuCap = Math.floor(budget * 0.85);
            for (const r of fu.rows) {
                if (picks.length >= fuCap) break;
                const sent = new Set<number>(r.sent_steps), queued = new Set<number>(r.queued);
                const next = (ria ? [22, 23, 24, 25, 26] : [22, 23, 24, 25, 26, 27]).find((st) => !sent.has(st));
                if (next === undefined || queued.has(next)) continue;
                if (dayDiff(et.date, dstr(r.first_day)) < (ria ? RIA_DAYS : DAYS)[next - 21]) continue;
                if (r.last_day && dayDiff(et.date, dstr(r.last_day)) < 4) continue;
                picks.push({ token: r.token, tz: r.tz, step: next });
            }
            // New first emails: contacts never emailed come first, in a fixed order, so the list simply continues after the last one sent.
            // Contacts who already received the earlier invitation emails come after all of them.
            const want = budget - picks.length;
            if (want > 0) {
                const inv = await query(`
                    SELECT c.token, c.tz FROM outreach_contacts c
                    WHERE ${ELIGIBLE} AND c.status IN ('pending','sent','clicked')
                      AND NOT EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step = 21)
                      AND NOT EXISTS (SELECT 1 FROM outreach_queue q WHERE q.token = c.token AND q.step = 21)
                      AND NOT EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step < 100 AND x.sent_at > NOW() - INTERVAL '4 days')
                    ORDER BY (NOT EXISTS (SELECT 1 FROM outreach_sends o WHERE o.token = c.token AND o.step < 100)) DESC, md5(c.token) LIMIT $2`, [ria, want]);
                for (const r of inv.rows) picks.push({ token: r.token, tz: r.tz, step: 21 });
            }
            for (const p of picks) {
                const localStart = ria ? 0 : zonedInstant(et.date, '09:00', p.tz || ET).getTime(); // retail: never before 9:00 AM local for the reader
                const winStart = Math.max(startAt, localStart);
                const span = Math.max(Math.floor((dEnd - winStart) / 1000), 60);
                const at = winStart + randomInt(0, span) * 1000;
                await query(`INSERT INTO outreach_queue (plan_date, token, step, domain, scheduled_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (token, step) DO NOTHING`,
                    [et.date, p.token, p.step, d.domain, new Date(Math.min(at, dEnd))]);
            }
            await query(`UPDATE outreach_plan_seq7 SET planned = $3 WHERE plan_date = $1 AND audience = $2`, [et.date, aud, picks.length]);
            out.push({ domain: d.domain, day: idx, budget, planned: picks.length });
        } catch (err) {
            await query(`DELETE FROM outreach_queue WHERE plan_date = $1 AND state = 'pending' AND step BETWEEN 21 AND 27 AND domain = $2`, [et.date, d.domain]);
            await query(`DELETE FROM outreach_plan_seq7 WHERE plan_date = $1 AND audience = $2`, [et.date, aud]);
            throw err;
        }
    }
    return { domains: out };
}

/** Every 50th real email on a domain: the same message goes to the owner inbox with a test marker (time and domain) in the subject. */
async function sendTestCopy(args: { transport: Transport; from: string; replyTo?: string; msg: { subject: string; text: string; html: string }; domain: string; step: number; sourceToken: string; headers: boolean }): Promise<void> {
    await ensureTables();
    const c = await query(`INSERT INTO outreach_domain_counter (domain, sent_total) VALUES ($1, 1) ON CONFLICT (domain) DO UPDATE SET sent_total = outreach_domain_counter.sent_total + 1, updated_at = NOW() RETURNING sent_total`, [args.domain]);
    const n = Number(c.rows[0].sent_total);
    if (n % TEST_COPY_EVERY !== 0) return;
    const stamp = new Date().toLocaleString('sv-SE', { timeZone: ET }).slice(0, 16);
    const subject = `[TEST ${stamp} ET ${args.domain} #${n}] ${args.msg.subject}`;
    let ok = false, note = '';
    try {
        const r = await sendMail({
            transport: args.transport, from: args.from, to: TEST_COPY_TO, replyTo: args.replyTo, subject, text: args.msg.text, html: args.msg.html,
            headers: args.headers ? { 'List-Unsubscribe': `<${BASE_URL}/u/${TEST_COPY_UNSUB_TOKEN}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined,
            token: 'testcopy', step: args.step, campaign: CAMPAIGN, idempotencyKey: `outreach-testcopy-${args.domain}-${n}`,
        });
        ok = r.ok; note = r.ok ? '' : `${r.status}: ${r.body}`.slice(0, 200);
    } catch (e) { note = (e as Error).message.slice(0, 200); }
    await query(`UPDATE outreach_domain_counter SET tests = tests + 1 WHERE domain = $1`, [args.domain]);
    await sendSeedCopies(args).catch(() => undefined);
    await query(`INSERT INTO outreach_test_copies (domain, sent_total, source_token, step, subject, ok, note) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [args.domain, n, args.sourceToken, args.step, subject, ok, note]);
}

/**
 * Seed mailbox check. When outreach_settings.seed_mailboxes holds a comma separated list of owned Gmail and Yahoo addresses, the same 50th message is also sent,
 * untouched (no test marker, same sender, links and template), to each seed with one hidden X-Placement-ID header. A reader on the server then looks up the
 * folder (Inbox, Promotions, Spam) and pauses the domain on repeated spam placement. Nothing is sent when the setting is empty.
 */
async function sendSeedCopies(args: { transport: Transport; from: string; replyTo?: string; msg: { subject: string; text: string; html: string }; domain: string; step: number; headers: boolean }): Promise<void> {
    const cfg = await query(`SELECT value FROM outreach_settings WHERE key = 'seed_mailboxes'`);
    const seeds = String(cfg.rows[0]?.value || '').split(',').map((x) => x.trim().toLowerCase()).filter((x) => /^[^@\s]+@[^@\s]+$/.test(x));
    if (!seeds.length) return;
    await query(`CREATE TABLE IF NOT EXISTS outreach_seed_checks (token TEXT PRIMARY KEY, domain TEXT NOT NULL, sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), mailboxes TEXT NOT NULL)`);
    // Retail domains: each check goes to two seeds only, one Gmail and one Yahoo, rotating through the list. Adviser domains keep the full list.
    const riaCfg = await query(`SELECT value FROM outreach_settings WHERE key = 'ria_domains'`);
    const riaSet = new Set(String(riaCfg.rows[0]?.value || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
    if (!riaSet.has(args.domain.toLowerCase())) {
        const isYahoo = (a: string) => /@(yahoo|ymail|rocketmail)\./.test(a);
        const gm = seeds.filter((a) => !isYahoo(a)), ya = seeds.filter(isYahoo);
        const done = await query(`SELECT COUNT(*)::int AS n FROM outreach_seed_checks WHERE lower(domain) <> ALL($1::text[])`, [[...riaSet, '']]);
        const k = Number(done.rows[0]?.n || 0);
        seeds.length = 0;
        if (gm.length) seeds.push(gm[k % gm.length]);
        if (ya.length) seeds.push(ya[k % ya.length]);
        if (!seeds.length) return;
    }
    const token = randomBytes(8).toString('hex');
    await query(`INSERT INTO outreach_seed_checks (token, domain, mailboxes) VALUES ($1,$2,$3)`, [token, args.domain, seeds.join(',')]);
    for (const to of seeds) {
        await sendMail({
            transport: args.transport, from: args.from, to, replyTo: args.replyTo, subject: args.msg.subject, text: args.msg.text, html: args.msg.html,
            headers: { 'X-Placement-ID': token, ...(args.headers ? { 'List-Unsubscribe': `<${BASE_URL}/u/${TEST_COPY_UNSUB_TOKEN}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : {}) },
            token: 'testcopy', step: args.step, campaign: CAMPAIGN, idempotencyKey: `outreach-seed-${token}-${to}`,
        }).catch(() => undefined);
    }
}

/** Combined daily total across both audiences: first day 150, then the previous day plus 50 plus a random 0 to 10. Stored once per day. */
async function combinedTotal(date: string, s: Record<string, string>): Promise<number> {
    const cur = await query(`SELECT budget FROM outreach_plan_seq7 WHERE plan_date = $1 AND audience = 'total'`, [date]);
    if (cur.rows[0]) return Number(cur.rows[0].budget);
    const prev = await query(`SELECT budget, day_index FROM outreach_plan_seq7 WHERE audience = 'total' AND plan_date < $1 ORDER BY plan_date DESC LIMIT 1`, [date]);
    const start = Number(s.ramp2_start || 150), step = Number(s.ramp2_step || 50), jitter = Number(s.ramp2_jitter || 10), cap = Number(s.ramp2_cap || 2000);
    const total = prev.rows[0] ? Math.min(Number(prev.rows[0].budget) + step + randomInt(0, jitter + 1), cap) : start;
    const idx = prev.rows[0] ? Number(prev.rows[0].day_index) + 1 : 1;
    await query(`INSERT INTO outreach_plan_seq7 (plan_date, audience, day_index, budget) VALUES ($1,'total',$2,$3) ON CONFLICT DO NOTHING`, [date, idx, total]);
    const again = await query(`SELECT budget FROM outreach_plan_seq7 WHERE plan_date = $1 AND audience = 'total'`, [date]);
    return Number(again.rows[0].budget);
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
    const combined = s.ramp_mode === 'combined';
    let budget: number;
    if (combined) {
        const total = await combinedTotal(et.date, s);
        const riaDay = isBusinessDay(et.date, et.dow) && et.hour * 60 + et.minute < 17 * 60 + 50;
        const riaPart = riaDay ? Math.round(total * Number(s.ria_share || 0.2)) : 0;
        budget = ria ? riaPart : total - riaPart;
        if (budget <= 0) return null;
    } else {
    budget = Math.min(Number(s[`${pre}ramp_start`] || (ria ? 100 : 200)) + Number(s[`${pre}ramp_step`] || (ria ? 25 : 50)) * (claimIdx - 1), Number(s[`${pre}ramp_cap`] || (ria ? 1000 : 2000)));
    }
    const claim = await query(`INSERT INTO outreach_plan_seq7 (plan_date, audience, day_index, budget) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING plan_date`, [et.date, aud, claimIdx, budget]);
    if (!claim.rowCount) return null;
    try {
        const rd = riaDomains(s);
        const doms = (await activeDomains(et.date)).filter((d) => rd.size === 0 || rd.has(d.domain.toLowerCase()) === ria);
        if (!doms.length) return { audience: aud, planned: 0, budget, reason: 'no active domains' };
        const cap = allocateBudget(doms, budget);
        const used = new Map<string, number>();
        const room = (d: string) => (cap.get(d) ?? 0) - (used.get(d) ?? 0);
        const best = () => doms.map((d) => d.domain).sort((a, b) => room(b) - room(a))[0];
        const picks: { token: string; tz: string; age?: string | null; domain: string; step: number }[] = [];

        // Follow-ups: emails 2 to 7 on the schedule, at least 4 days after the last email.
        const fu = await query(`
            SELECT c.token, c.tz, c.age, s1.domain, (s1.sent_at AT TIME ZONE 'America/New_York')::date AS first_day,
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
            const next = (ria ? [22, 23, 24, 25, 26] : [22, 23, 24, 25, 26, 27]).find((st) => !sent.has(st));
            if (next === undefined || queued.has(next)) continue;
            if (dayDiff(et.date, dstr(r.first_day)) < (ria ? RIA_DAYS : DAYS)[next - 21]) continue;
            if (r.last_day && dayDiff(et.date, dstr(r.last_day)) < 4) continue;
            const d = cap.has(String(r.domain)) && room(String(r.domain)) > 0 ? String(r.domain) : best();
            if (room(d) <= 0) continue;
            picks.push({ token: r.token, tz: r.tz, age: r.age, domain: d, step: next }); used.set(d, (used.get(d) ?? 0) + 1);
        }

        // First emails: people never emailed come first. People emailed before the new sequence start fresh afterwards.
        const want = budget - picks.length;
        if (want > 0) {
            const inv = await query(`
                SELECT c.token, c.tz, c.age FROM outreach_contacts c
                WHERE ${ELIGIBLE} AND c.status IN ('pending','sent','clicked')
                  AND NOT EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step = 21)
                  AND NOT EXISTS (SELECT 1 FROM outreach_queue q WHERE q.token = c.token AND q.step = 21)
                  AND NOT EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step < 100 AND x.sent_at > NOW() - INTERVAL '4 days')
                ORDER BY (c.status = 'pending') DESC, md5(c.token) LIMIT $2`, [ria, want]);
            for (const r of inv.rows) {
                if (picks.length >= budget) break;
                const d = best();
                if (room(d) <= 0) break;
                picks.push({ token: r.token, tz: r.tz, age: r.age, domain: d, step: 21 }); used.set(d, (used.get(d) ?? 0) + 1);
            }
        }
        for (const p of picks) {
            // Never before 9:00 AM local for the reader; spread evenly through the rest of the window.
            const localStart = ria ? 0 : zonedInstant(et.date, '09:00', p.tz || ET).getTime();
            // Life stage send hours (ET), kept inside the day's window; falls back to the full window late in the day.
            const sg = !ria && !isStageControl(p.token) ? stageForAge(p.age) : null;
            let winStart = Math.max(startAt, localStart), winEnd = endAt;
            if (sg) {
                const hs = zonedInstant(et.date, STAGE_HOURS[sg][0], ET).getTime(), he = zonedInstant(et.date, STAGE_HOURS[sg][1], ET).getTime();
                const a = Math.max(winStart, hs), b = Math.min(winEnd, he);
                if (b - a >= 15 * 60_000) { winStart = a; winEnd = b; }
            }
            const st = winStart;
            const span = Math.max(Math.floor((winEnd - st) / 1000), 60);
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
    if (s.seeds_enabled === 'false') return null; // the daily test-inbox seed sends are switched off
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
    if (s.ramp_mode === 'perdomain') {
        const pd = await planPerDomain(now, s);
        out.retail = pd;
        out.seeds = (s.perdomain_start && etParts(now).date < s.perdomain_start) ? null : await planSeeds(now, s);
        const planned = ((pd as any)?.domains ?? []).reduce((a: number, x: any) => a + Number(x.planned || 0), 0);
        return { planned, budget: ((pd as any)?.domains ?? []).reduce((a: number, x: any) => a + Number(x.budget || 0), 0), dayIndex: Number((pd as any)?.domains?.[0]?.day ?? 0), detail: out } as unknown as Record<string, unknown>;
    }
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

export async function sendSeq7(row: { id: number; token: string; step: number; domain: string }, s: Record<string, string>, c: any, fromLocal: string, transport: Transport): Promise<'sent' | 'skipped' | 'failed'> {
    const skip = async (note: string) => { await query(`UPDATE outreach_queue SET state = 'skipped', note = $2 WHERE id = $1`, [row.id, note]); return 'skipped' as const; };
    const isSeed = c.wave === 'seed';
    const rd = riaDomains(s);
    const ria = isSeed ? rd.has(row.domain.toLowerCase()) : c.wave === 'ria';
    const n = isSeed ? (row.step % 10 >= 1 && row.step % 10 <= (ria ? 6 : 7) ? row.step % 10 : 1) : row.step - 20;
    if (!isSeed && ria && n > 6) return skip('adviser sequence ends at email 6');
    const ownerTest = isOwnerTest(c.email);
    if (!isSeed) {
        if (['unsubscribed', 'bounced', 'complained', 'subscribed', 'confirmed', 'monthly', 'checked_in', 'snoozed'].includes(c.status)) return skip(`status ${c.status}`);
        if ((await query(`SELECT 1 FROM newsletter_suppression WHERE email = $1`, [c.email])).rowCount) return skip('suppressed');
        const sub = await query(`SELECT 1 FROM newsletter_subscribers WHERE status IN ('confirmed','pending') AND email = ANY($1::text[]) LIMIT 1`, [[String(c.email).toLowerCase(), String(c.subscriber_email ?? '').toLowerCase()].filter(Boolean)]);
        if (sub.rowCount && !ownerTest) return skip('already subscribed');
        const applied = await query(`SELECT 1 FROM program_application WHERE email_norm = $1 UNION ALL SELECT 1 FROM program_participant WHERE email_norm = $1 LIMIT 1`, [String(c.email).toLowerCase()]).catch(() => ({ rowCount: 0 }));
        if (applied.rowCount && !ownerTest) return skip('applied to program');
        if (ria && c.wave !== 'ria') return skip('audience mismatch');
    }
    const facts = await liveFacts(new Date());
    // Life stage wording: from the age field; seeds rotate through the stages so the daily test shows each one.
    let stage: Stage | null = null;
    if (!ria) {
        if (isSeed) stage = STAGES[Math.floor(row.step / 10) % STAGES.length];
        else if (!isStageControl(c.token)) stage = stageForAge(c.age);
    }
    const linkBase = s[`link_host_${row.domain.toLowerCase()}`] ? `https://${s[`link_host_${row.domain.toLowerCase()}`]}` : BASE_URL; // branded link host per sending domain, when enabled
    const rendered = ria ? renderRia({ token: c.token, firstName: c.first_name, baseUrl: linkBase, mailingAddress: MAILING_ADDRESS, n, step: row.step < SEED_BASE ? row.step : 20 + n }) : renderSeq7({ noChart: s.email5_chart === 'false', token: c.token, firstName: c.first_name, baseUrl: linkBase, mailingAddress: MAILING_ADDRESS, step: n, n, facts, audience: ria ? 'ria' : 'retail', stage });
    const msg = s.lean_content === 'false' ? rendered : leanify(rendered);
    if (!transportKeyPresent(transport)) return 'failed';
    const from = `${s.from_display || 'Eric Huang'} <${fromLocal}@${row.domain}>`;
    let res;
    try {
        res = await sendMail({
            transport, from, to: isSeed ? (String(c.email || '') || SEED_TO) : c.email, replyTo: s.reply_to || undefined, subject: msg.subject, text: msg.text, html: msg.html,
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
    if (s.ramp_mode === 'perdomain' && !isSeed && !ownerTest && !row.token.startsWith('dt')) {
        await sendTestCopy({ transport, from, replyTo: s.reply_to || undefined, msg, domain: row.domain, step: row.step, sourceToken: row.token, headers: s.list_unsub_header !== 'false' }).catch(() => undefined);
    }
    if (!isSeed) await query(`UPDATE outreach_contacts SET status = 'sent', updated_at = NOW() WHERE token = $1 AND status = 'pending'`, [row.token]);
    return 'sent';
}
