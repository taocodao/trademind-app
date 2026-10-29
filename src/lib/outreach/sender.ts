/**
 * Tokenized invitation sender: daily planner, due-row sender, health gates and daily report.
 *
 * Transport: per sending domain, Resend or SendGrid (outreach_domains.transport), no open or click tracking,
 * links on trademind.bot, one-click unsubscribe headers. New domains warm up with a per-domain daily cap
 * (cap_start + cap_step per day since activation, up to cap_max).
 *
 * Ramp (set by Eric, Oct 2026): 100 sends on the first send day, +50 each send day, seven days a week,
 * spread across 8:00 AM to 8:00 PM ET.
 * Pilot wave first; each segment's rollout (W2) is released by the confirmed-rate gate.
 * Nothing sends while outreach_settings.paused = 'true'.
 */
import { randomInt, createHash } from 'crypto';
import { query } from '@/lib/db';
import { MAILING_ADDRESS } from '@/lib/newsletter/email';
import { INVITE_TEMPLATES } from './templates';
import { INVITE_TEMPLATES_V5 } from './templates-v5';
import { processRecaps } from './recap';
import { FOLLOWUPS_V5 } from './followups-v5';
import { renderV6, isV6Control, hasV6 } from './copy-v6';
import { renderWS } from './copy-ws';
import { renderV8 } from './copy-v8';
import { renderSeq6, SEQ6_TEMPLATE, SEQ6_STEPS, SEQ6_DAYS, SEQ6_REINTRO_LABEL, SEQ6_OFFSET_LADDER, seq6Label } from './copy-seq6';
import { STAGE_BY_STEP, STEP_DAYS, PREVIEW_VARIANT, followupFooterText, followupHtml } from './followup';
import { BASE_URL, CAMPAIGN, ensureOutreachTables, getSettings, setSetting } from './db';
import { sendMail, transportKeyPresent, type Transport } from './transport';
import { seq7Active, planSeq7, sendSeq7, isSeq7Row, seq7WindowOpen } from './seq7-live';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ET = 'America/New_York';
const HOLIDAYS = new Set([
    '2026-11-26', '2026-11-27', '2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01', '2027-01-18',
]);
const SEED_EMAILS = ['web3aistore@gmail.com', 'web3aistore1@gmail.com', 'web3aistore2@gmail.com', 'web3aistore3@gmail.com'];

export function etParts(d: Date): { date: string; hour: number; minute: number; dow: number } {
    const f = new Intl.DateTimeFormat('en-US', {
        timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    });
    const p: Record<string, string> = {};
    for (const x of f.formatToParts(d)) p[x.type] = x.value;
    const dows: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute), dow: dows[p.weekday] };
}

/** UTC instant for a wall-clock time (HH:MM) on a date in a given IANA zone. */
export function zonedInstant(date: string, hhmm: string, tz: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    const guess = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
    for (let i = 0; i < 3; i++) {
        const f = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        });
        const p: Record<string, string> = {};
        for (const x of f.formatToParts(guess)) p[x.type] = x.value;
        const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
        const want = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), h, m);
        if (shown === want) break;
        guess.setTime(guess.getTime() + (want - shown));
    }
    return guess;
}

/** New follow-up timing (days after the first email) for the sample-first copy: FU1 about 4 business days, FINAL about 5 to 7 business days later. */
const STEP_DAYS_V7: Record<number, number> = { 2: 5, 7: 13 };
/** Contacts who qualify for the previewer follow-ups are split 50/50 into triggered and unchanged, by a hash of the token. */
export function isPreviewTriggered(token: string): boolean {
    return parseInt(createHash('sha256').update(`${token}:preview-trigger`).digest('hex').slice(0, 8), 16) % 2 === 0;
}
/** Business day in Eastern time (Monday to Friday, not a listed holiday). */
export function isBusinessDay(date: string, dow: number): boolean {
    return dow >= 1 && dow <= 5 && !HOLIDAYS.has(date);
}

/** Sends run seven days a week, including holidays. */
export function isSendDay(_date: string, _dow: number): boolean {
    return true; // every day, including weekends and holidays
}

// ---------- rendering ----------

function escHtml(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Subject lines begin with "{{first_name}}, ". Without a name that prefix is dropped and the rest is capitalized. */
function fillSubject(subject: string, first: string): string {
    if (first) return subject.replace(/\{\{first_name\}\}/g, first);
    const rest = subject.replace(/^\{\{first_name\}\},\s*/, '').replace(/\{\{first_name\}\}/g, 'there');
    return rest.charAt(0).toUpperCase() + rest.slice(1);
}

export function renderInvite(opts: {
    template: string; step: number; token: string; firstName: string | null; senderName: string; useHtml?: boolean;
    branch?: 'C' | 'N'; seqV2?: boolean;
}): { subject: string; text: string; html: string | null; unsubUrl: string } {
    const stage = STAGE_BY_STEP[opts.step];
    const fuKey = stage && opts.seqV2 && opts.branch ? `${opts.template}_${opts.branch}_${stage}` : null;
    const fu = fuKey ? FOLLOWUPS_V5[fuKey] : undefined;
    if (stage && opts.seqV2 && opts.branch && !fu) throw new Error(`Unknown follow-up ${fuKey}`);
    if (stage && !fu && opts.step !== 2) throw new Error(`Follow-up step ${opts.step} needs the v2 sequence`);
    const key = opts.step === 3 ? 'CHECKIN' : opts.step === 2 ? 'FU' : opts.template;
    const v5 = fu
        ? { subject: fu.subject, body: `${fu.body.replace('\n\n{{sender_name}}', '\n\nReply to this email or write to me at eric@trademind.bot.\n\n{{sender_name}}')}\n${followupFooterText()}`, html: opts.useHtml === true ? followupHtml(fu.body, fu.preheader) : null }
        : INVITE_TEMPLATES_V5[key];
    const legacy = INVITE_TEMPLATES[key];
    // v5 (HTML plus plain text, new subjects) only when switched on; follow-ups v2 and the check-in always use v5.
    const useV5 = !!v5 && (!!fu || opts.useHtml === true || key === 'CHECKIN');
    const t = useV5 ? v5 : legacy;
    if (!t) throw new Error(`Unknown template ${key}`);
    const variant = fuKey ? PREVIEW_VARIANT[fuKey] : undefined;
    const unsubUrl = `${BASE_URL}/u/${opts.token}`;
    const first = (opts.firstName ?? '').trim();
    const map: Record<string, string> = {
        first_name: first || 'there',
        preview_url: `${BASE_URL}/r/${opts.token}/p?s=${opts.step}${variant ? `&v=${variant}` : ''}`,
        subscribe_url: `${BASE_URL}/r/${opts.token}/s?s=${opts.step}`,
        unsub_url: unsubUrl,
        sender_name: opts.senderName,
        mailing_address: MAILING_ADDRESS,
        sig_sep: '-'.repeat(2),
    };
    const fill = (src: string, esc: boolean) => src.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => esc ? escHtml(map[k] ?? '') : (map[k] ?? ''));
    const subject = useV5 ? fillSubject(t.subject, first) : t.subject;
    const trk = (kind: string, extra = '') => `${BASE_URL}/r/${opts.token}/${kind}?s=${opts.step}${extra}`;
    // Track every link: section links and the header link in the email go through the personal redirect.
    const track = (src: string, isHtml: boolean) => src
        .replace(/https:\/\/trademind\.bot\/newsletter\/inside#(weather|readout|flight|turbulence)/g, (_m, a: string) => isHtml ? trk('i', `&amp;a=${a}`) : trk('i', `&a=${a}`))
        .replace(/https:\/\/trademind\.bot\/newsletter\/inside(?![#\w\/])/g, trk('i'))
        .replace(/href="https:\/\/trademind\.bot"/g, `href="${trk('h')}"`);
    const text = track(fill(t.body, false), false);
    const html = useV5 && v5.html && opts.useHtml === true ? track(fill(v5.html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(subject)}</title>`), true), true) : null;
    return { subject, text, html, unsubUrl };
}

// ---------- planning ----------

interface PlanResult { planned: number; budget: number; dayIndex: number; reason?: string }

function rampBudget(dayIndex: number, s: Record<string, string>): number {
    const b = Number(s.ramp_start || 100) + Number(s.ramp_step || 50) * (dayIndex - 1);
    return Math.min(b, Number(s.ramp_cap || 10000));
}

/** Segments whose rollout wave is released: confirmed_rate >= 1.5% after >= 300 delivered in the pilot. */
export async function releasedSegments(): Promise<string[]> {
    const r = await query(`
        SELECT c.segment,
               COUNT(*) FILTER (WHERE s.status IN ('sent','delivered')) AS delivered,
               COUNT(*) FILTER (WHERE c.status = 'confirmed') AS confirmed
        FROM outreach_contacts c
        JOIN outreach_sends s ON s.token = c.token AND s.step = 1
        WHERE c.wave = 'W1_pilot'
        GROUP BY c.segment`);
    const out: string[] = [];
    for (const row of r.rows) {
        const d = Number(row.delivered), c = Number(row.confirmed);
        if (d >= 300 && c / d >= 0.015) out.push(String(row.segment));
    }
    return out;
}

interface ActiveDomain { domain: string; from_local: string; weight: number; limit: number }

/** Daily limit for a domain: warm-up cap (start + step per day since activation, up to max); Infinity when no cap is set. */
function domainLimit(d: { cap_start: number | null; cap_step: number | null; cap_max: number | null; activated_on: string | null }, date: string): number {
    if (d.cap_start === null || d.cap_start === undefined) return Infinity;
    const days = d.activated_on ? Math.max(0, Math.round((Date.parse(date) - Date.parse(String(d.activated_on).slice(0, 10))) / 86_400_000)) : 0;
    const v = Number(d.cap_start) + Number(d.cap_step ?? 0) * days;
    return Math.max(0, Math.min(v, d.cap_max ? Number(d.cap_max) : v));
}

export async function activeDomains(date: string): Promise<ActiveDomain[]> {
    await query(`UPDATE outreach_domains SET activated_on = $1::date WHERE status = 'active' AND activated_on IS NULL`, [date]);
    const r = await query(`SELECT domain, from_local, weight::float AS weight, cap_start, cap_step, cap_max, activated_on::text AS activated_on FROM outreach_domains WHERE status = 'active' ORDER BY domain`);
    return r.rows.map((x) => ({
        domain: String(x.domain), from_local: String(x.from_local), weight: Number(x.weight),
        limit: domainLimit({ cap_start: x.cap_start, cap_step: x.cap_step, cap_max: x.cap_max, activated_on: x.activated_on }, date),
    }));
}

/** Split a daily budget across domains by weight, never giving a domain more than its warm-up limit. */
export function allocateBudget(doms: { domain: string; weight: number; limit: number }[], budget: number): Map<string, number> {
    const out = new Map<string, number>(doms.map((d) => [d.domain, 0]));
    let left = budget;
    let open = doms.filter((d) => d.limit > 0);
    for (let guard = 0; guard < 10 && left > 0 && open.length; guard++) {
        const w = open.reduce((a, d) => a + d.weight, 0) || 1;
        let spent = 0;
        const next: typeof open = [];
        for (const d of open) {
            const room = Math.max(0, d.limit - (out.get(d.domain) ?? 0));
            const give = Math.min(room, Math.floor((left * d.weight) / w));
            out.set(d.domain, (out.get(d.domain) ?? 0) + give); spent += give;
            if (room - give > 0) next.push(d);
        }
        if (spent === 0) {
            // Rounding leftovers go one by one to domains that still have room.
            for (const d of next) { if (left - spent <= 0) break; out.set(d.domain, (out.get(d.domain) ?? 0) + 1); spent += 1; }
            if (spent === 0) break;
        }
        left -= spent; open = next;
    }
    return out;
}

export async function planToday(now = new Date()): Promise<PlanResult | null> {
    await ensureOutreachTables();
    const s = await getSettings();
    if (s.paused !== 'false') return null;
    const et = etParts(now);
    if (!s.start_date || et.date < s.start_date) return null;
    if (seq7Active(s, now)) return (await planSeq7(now, s)) as unknown as PlanResult | null;
    if (!isSendDay(et.date, et.dow)) return null;
    if (et.hour < 5) return null;

    {
        const exists = await query(`SELECT 1 FROM outreach_plan_days WHERE plan_date = $1`, [et.date]);
        if (exists.rowCount) return null;

        const idx = Number((await query(`SELECT COUNT(*)::int AS n FROM outreach_plan_days`)).rows[0].n) + 1;
        const budget = rampBudget(idx, s);
        // Claim the day first: a concurrent tick that loses the insert does nothing.
        const claim = await query(
            `INSERT INTO outreach_plan_days (plan_date, day_index, budget, planned) VALUES ($1, $2, $3, 0) ON CONFLICT (plan_date) DO NOTHING RETURNING plan_date`,
            [et.date, idx, budget]
        );
        if (!claim.rowCount) return null;
        try {
        const doms = await activeDomains(et.date);
        if (!doms.length) return { planned: 0, budget, dayIndex: idx, reason: 'no active domains' };

        // Expired leftovers from earlier days go back to the pool.
        await query(`DELETE FROM outreach_queue WHERE state IN ('pending','expired') AND plan_date < $1`, [et.date]);

        const cap = allocateBudget(doms, budget);

        // Follow-ups. v2 sequence: 7, 14, 21 and 28 days after the first email to everyone who has not subscribed or
        // unsubscribed. People with a real click get all four; people without a click get FU1 and FINAL, plus FU2 and
        // FU3 while the complaint rate stays low. The old single follow-up runs when seq_v2 is off.
        const seqV2 = s.seq_v2 === 'true';
        const gap = Number(s.followup_gap_days || 6);
        let midOn = s.n_mid_steps !== 'false';
        if (midOn) {
            const cr = await query(`SELECT COUNT(*)::int AS sent, COUNT(*) FILTER (WHERE complaint)::int AS complaints FROM outreach_sends WHERE sent_at > NOW() - INTERVAL '14 days' AND step < 100`);
            const { sent, complaints } = cr.rows[0] as { sent: number; complaints: number };
            if (complaints >= 2 && complaints / Math.max(sent, 1) >= 0.001) midOn = false;
        }
        const fu = seqV2
            ? await query(`
                SELECT c.token, c.tz, s1.domain,
                       (s1.sent_at AT TIME ZONE 'America/New_York')::date AS first_day,
                       (SELECT MAX(sent_at AT TIME ZONE 'America/New_York')::date FROM outreach_sends x WHERE x.token = c.token AND x.step < 100) AS last_day,
                       (SELECT x.template FROM outreach_sends x WHERE x.token = c.token AND x.step = 2 LIMIT 1) AS t2,
                       (SELECT (x.sent_at AT TIME ZONE 'America/New_York')::date FROM outreach_sends x WHERE x.token = c.token AND x.step = 2 LIMIT 1) AS d2,
                       COALESCE((SELECT array_agg(x.step) FROM outreach_sends x WHERE x.token = c.token), '{}') AS sent_steps,
                       COALESCE((SELECT array_agg(q.step) FROM outreach_queue q WHERE q.token = c.token AND q.state = 'pending'), '{}') AS queued_steps,
                       (c.status = 'clicked' OR EXISTS (SELECT 1 FROM outreach_click_events e WHERE e.token = c.token AND (NOT e.is_bot OR e.human_confirmed))) AS has_click
                FROM outreach_contacts c
                JOIN outreach_sends s1 ON s1.token = c.token AND s1.step = 1 AND s1.status IN ('sent','delivered')
                WHERE c.status IN ('sent','clicked') AND c.wave <> 'seed'
                  AND (s1.sent_at AT TIME ZONE 'America/New_York')::date <= ($1::date - 4)
                  AND NOT EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step = 7)
                  AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
                  AND NOT EXISTS (SELECT 1 FROM newsletter_subscribers sub WHERE sub.status IN ('confirmed','pending') AND sub.email IN (c.email, COALESCE(c.subscriber_email, c.email)))
                ORDER BY s1.sent_at ASC
                LIMIT 6000`, [et.date])
            : await query(`
            SELECT c.token, c.tz, s1.domain
            FROM outreach_contacts c
            JOIN outreach_sends s1 ON s1.token = c.token AND s1.step = 1
            LEFT JOIN outreach_sends s2 ON s2.token = c.token AND s2.step = 2
            LEFT JOIN outreach_queue q2 ON q2.token = c.token AND q2.step = 2
            WHERE c.status = 'sent' AND c.wave <> 'seed' AND s2.id IS NULL AND q2.id IS NULL
              AND s1.status IN ('sent','delivered')
              AND (s1.sent_at AT TIME ZONE 'America/New_York')::date <= ($1::date - $2::int)
              AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
              AND NOT EXISTS (SELECT 1 FROM outreach_click_events e WHERE e.token = c.token AND e.human_confirmed)
            ORDER BY s1.sent_at ASC
            LIMIT $3`, [et.date, gap, budget]);
        const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
        const dstr = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
        const fuRows: { token: string; tz: string; domain: string; step: number }[] = [];

        // Six-email panel sequence: people whose first email was S1 follow their own schedule (day 7, 14, 21, 28, 35),
        // at least 4 days apart, and are kept out of every other follow-up path.
        const treated = new Set<string>();
        // People whose first email went out before copy_prog_start (and who have not had the old close-out) join the new
        // sequence at their next follow-up. Their next email is the first of steps 2, 5, 6, 7, 8 they have not received.
        const progStartMs = s.copy_prog_start ? Date.parse(s.copy_prog_start) : NaN;
        const progStartIso = Number.isFinite(progStartMs) && Date.now() >= progStartMs ? new Date(progStartMs).toISOString() : null;
        if (seqV2) {
            const sq = await query(`
                SELECT c.token, c.tz, s1.domain,
                       (s1.sent_at AT TIME ZONE 'America/New_York')::date AS first_day,
                       (SELECT MAX(sent_at AT TIME ZONE 'America/New_York')::date FROM outreach_sends x WHERE x.token = c.token AND x.step < 100) AS last_day,
                       COALESCE((SELECT array_agg(x.step) FROM outreach_sends x WHERE x.token = c.token), '{}') AS sent_steps,
                       COALESCE((SELECT array_agg(q.step) FROM outreach_queue q WHERE q.token = c.token AND q.state = 'pending'), '{}') AS queued_steps
                FROM outreach_contacts c
                JOIN outreach_sends s1 ON s1.token = c.token AND s1.step = 1 AND s1.status IN ('sent','delivered')
                WHERE c.status IN ('sent','clicked') AND c.wave <> 'seed'
                  AND (s1.template = '${SEQ6_TEMPLATE}'
                       OR ($1::timestamptz IS NOT NULL AND s1.sent_at < $1::timestamptz
                           AND NOT EXISTS (SELECT 1 FROM outreach_sends x7 WHERE x7.token = c.token AND x7.step = 7 AND x7.template NOT LIKE 'S%')))
                  AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
                  AND NOT EXISTS (SELECT 1 FROM newsletter_subscribers sub WHERE sub.status IN ('confirmed','pending') AND sub.email IN (c.email, COALESCE(c.subscriber_email, c.email)))
                  AND NOT EXISTS (SELECT 1 FROM program_application pa WHERE pa.email_norm = LOWER(c.email))
                  AND NOT EXISTS (SELECT 1 FROM program_participant pp WHERE pp.email_norm = LOWER(c.email))
                LIMIT 6000`, [progStartIso]).catch(() => ({ rows: [] as any[] }));
            for (const row of sq.rows) {
                treated.add(row.token);
                const sentS = new Set<number>(row.sent_steps);
                const queuedS = new Set<number>(row.queued_steps);
                // People who got the re-introduction (RE_ or S1R as step 2) have it as their email 1: their emails 2 to 6 use steps 5 to 9, counted from that date.
                const offset = !!row.t2 && (String(row.t2).startsWith('RE_') || row.t2 === SEQ6_REINTRO_LABEL) && !!row.d2;
                let nextS: number | undefined;
                if (offset) {
                    nextS = (SEQ6_OFFSET_LADDER as readonly number[]).find((st) => !sentS.has(st));
                    if (nextS === undefined || queuedS.has(nextS)) continue;
                    const nn = (SEQ6_OFFSET_LADDER as readonly number[]).indexOf(nextS) + 2;
                    if (dayDiff(et.date, dstr(row.d2)) < 7 * (nn - 1)) continue;
                } else {
                    nextS = [2, 5, 6, 7, 8].find((st) => !sentS.has(st));
                    if (nextS === undefined || queuedS.has(nextS)) continue;
                    if (dayDiff(et.date, dstr(row.first_day)) < SEQ6_DAYS[nextS]) continue;
                }
                if (row.last_day && dayDiff(et.date, dstr(row.last_day)) < 4) continue;
                fuRows.push({ token: row.token, tz: row.tz, domain: row.domain, step: nextS });
            }
        }

        // Previewer follow-ups: a person who viewed the preview page and scrolled, tapped or typed (confirmed by the page script)
        // gets one neutral email the next business morning (step 5, "another sample") and one more 7 days later (step 6).
        // Half of eligible previewers are triggered; the rest stay on the unchanged schedule. Anyone who already received the
        // closing email, signed up, or opted out gets nothing. One acquisition email per 24 hours, at most two follow-ups in 7 days.
        const previewRows: { token: string; tz: string; domain: string; step: number; morning: boolean }[] = [];
        if (seqV2 && s.preview_trigger !== 'off') {
            const pv = await query(`
                SELECT c.token, c.tz, s1.domain, MIN(e.ts) AS first_ts,
                       COALESCE((SELECT array_agg(x.step) FROM outreach_sends x WHERE x.token = c.token), '{}') AS sent_steps,
                       COALESCE((SELECT array_agg(q.step) FROM outreach_queue q WHERE q.token = c.token AND q.state = 'pending'), '{}') AS queued_steps,
                       (SELECT MAX(x.sent_at) FROM outreach_sends x WHERE x.token = c.token AND x.step < 100) AS last_sent,
                       (SELECT MAX(x.sent_at) FROM outreach_sends x WHERE x.token = c.token AND x.step = 5) AS s5_at,
                       (SELECT COUNT(*)::int FROM outreach_sends x WHERE x.token = c.token AND x.step IN (2,5,6,7) AND x.sent_at > NOW() - INTERVAL '7 days') AS fu_7d
                FROM outreach_contacts c
                JOIN outreach_sends s1 ON s1.token = c.token AND s1.step = 1 AND s1.status IN ('sent','delivered')
                JOIN outreach_click_events e ON e.token = c.token AND e.link_type = 'preview' AND NOT e.is_bot AND e.human_confirmed AND e.interacted
                WHERE c.status IN ('sent','clicked') AND c.wave <> 'seed'
                  AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
                  AND NOT EXISTS (SELECT 1 FROM newsletter_subscribers sub WHERE sub.status IN ('confirmed','pending') AND sub.email IN (c.email, COALESCE(c.subscriber_email, c.email)))
                GROUP BY c.token, c.tz, s1.domain
                LIMIT 3000`);
            const nowMs0 = now.getTime();
            for (const row of pv.rows) {
                if (treated.has(row.token)) continue;
                if (isV6Control(row.token) || !isPreviewTriggered(row.token)) continue;
                treated.add(row.token);
                const sent = new Set<number>(row.sent_steps);
                const queued = new Set<number>(row.queued_steps);
                if (sent.has(7)) continue;
                if (!isBusinessDay(et.date, et.dow)) continue;
                if (row.last_sent && nowMs0 - new Date(row.last_sent).getTime() < 24 * 3600_000) continue;
                if (Number(row.fu_7d) >= 2) continue;
                const next = !sent.has(5) ? 5 : !sent.has(6) ? 6 : undefined;
                if (next === undefined || queued.has(next)) continue;
                if (next === 5) {
                    const clickDay = etParts(new Date(row.first_ts)).date;
                    if (!(clickDay < et.date) || nowMs0 - new Date(row.first_ts).getTime() < 6 * 3600_000) continue;
                } else {
                    if (!row.s5_at || nowMs0 - new Date(row.s5_at).getTime() < 7 * 86_400_000 - 3 * 3600_000) continue;
                }
                previewRows.push({ token: row.token, tz: row.tz, domain: row.domain, step: next, morning: true });
            }
        }

        for (const row of fu.rows) {
            if (!seqV2) { fuRows.push({ token: row.token, tz: row.tz, domain: row.domain, step: 2 }); continue; }
            if (treated.has(row.token)) continue;
            if (!isV6Control(row.token)) {
                // Sample-first sequence: FU1 then the close-out, for everyone not in the previewer path.
                const sentV7 = new Set<number>(row.sent_steps);
                const queuedV7 = new Set<number>(row.queued_steps);
                const nextV7 = [2, 7].find((st) => !sentV7.has(st));
                if (nextV7 === undefined || queuedV7.has(nextV7)) continue;
                if (dayDiff(et.date, dstr(row.first_day)) < STEP_DAYS_V7[nextV7]) continue;
                if (row.last_day && dayDiff(et.date, dstr(row.last_day)) < 4) continue;
                fuRows.push({ token: row.token, tz: row.tz, domain: row.domain, step: nextV7 });
                continue;
            }
            const sentSteps = new Set<number>(row.sent_steps);
            const queued = new Set<number>(row.queued_steps);
            const seq = row.has_click || midOn ? [2, 5, 6, 7] : [2, 7];
            const next = seq.find((st) => !sentSteps.has(st));
            if (next === undefined || queued.has(next)) continue;
            if (dayDiff(et.date, dstr(row.first_day)) < STEP_DAYS[next]) continue;
            if (row.last_day && dayDiff(et.date, dstr(row.last_day)) < 4) continue; // keep at least 4 days between emails
            fuRows.push({ token: row.token, tz: row.tz, domain: row.domain, step: next });
        }

        const picks: { token: string; tz: string; domain: string; step: number; morning?: boolean }[] = [];
        const used = new Map<string, number>();
        const room = (d: string) => (cap.get(d) ?? 0) - (used.get(d) ?? 0);
        // Check-ins: people who asked to be contacted again after 3 or 6 months (one email, then done).
        const ci = await query(`
            SELECT c.token, c.tz FROM outreach_contacts c
            WHERE c.status = 'snoozed' AND c.snooze_until IS NOT NULL AND c.snooze_until <= NOW()
              AND NOT EXISTS (SELECT 1 FROM outreach_sends s WHERE s.token = c.token AND s.step = 3)
              AND NOT EXISTS (SELECT 1 FROM outreach_queue q WHERE q.token = c.token AND q.step = 3)
              AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
            ORDER BY c.snooze_until ASC LIMIT $1`, [budget]);
        for (const row of ci.rows) {
            const d = doms.map((x) => x.domain).sort((a, b) => room(b) - room(a))[0];
            if (room(d) <= 0) break;
            picks.push({ token: row.token, tz: row.tz, domain: d, step: 3 });
            used.set(d, (used.get(d) ?? 0) + 1);
        }
        for (const row of previewRows) {
            let d = String(row.domain);
            if (!cap.has(d)) d = doms.map((x) => x.domain).sort((a, b) => room(b) - room(a))[0];
            if (room(d) <= 0) continue;
            picks.push({ token: row.token, tz: row.tz, domain: d, step: row.step, morning: true });
            used.set(d, (used.get(d) ?? 0) + 1);
        }
        const fuCap = Math.floor(budget * 0.55);
        for (const row of fuRows) {
            if (picks.length >= fuCap) break;
            let d = String(row.domain);
            if (!cap.has(d)) d = doms.map((x) => x.domain).sort((a, b) => room(b) - room(a))[0];
            if (room(d) <= 0) continue;
            picks.push({ token: row.token, tz: row.tz, domain: d, step: row.step });
            used.set(d, (used.get(d) ?? 0) + 1);
        }

        // Invitations: pilot always, rollout only for released segments; round-robin across segments.
        const released = await releasedSegments();
        const want = budget - picks.length;
        if (want > 0) {
            const inv = await query(`
                SELECT token, tz FROM (
                    SELECT c.token, c.tz, c.segment, (c.wave = 'W1_pilot') AS is_pilot,
                           ROW_NUMBER() OVER (PARTITION BY c.segment, (c.wave = 'W1_pilot') ORDER BY md5(c.token)) AS rn
                    FROM outreach_contacts c
                    WHERE c.status = 'pending' AND c.wave <> 'seed'
                      AND (c.wave = 'W1_pilot' OR c.segment = ANY($1::text[]))
                      AND NOT EXISTS (SELECT 1 FROM outreach_queue q WHERE q.token = c.token AND q.step = 1)
                      AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
                      AND NOT EXISTS (SELECT 1 FROM newsletter_subscribers sub WHERE sub.email = c.email AND sub.status IN ('confirmed','pending'))
                ) x
                ORDER BY is_pilot DESC, rn, segment
                LIMIT $2`, [released, want * 2]);
            // Pilot contacts first, round-robin across segments; fill domains evenly by remaining room.
            const order = doms.map((d) => d.domain);
            for (const row of inv.rows) {
                if (picks.length >= budget) break;
                const d = order.sort((a, b) => room(b) - room(a))[0];
                if (room(d) <= 0) break;
                picks.push({ token: row.token, tz: row.tz, domain: d, step: 1 });
                used.set(d, (used.get(d) ?? 0) + 1);
            }
        }

        // Seeds: one per active domain, rotating, with unique steps >= 100 so repeats are allowed.
        const seedRows: { token: string; domain: string; step: number }[] = [];
        for (let i = 0; i < doms.length; i++) {
            const email = SEED_EMAILS[(idx - 1 + i) % SEED_EMAILS.length];
            const sr = await query(`SELECT token FROM outreach_contacts WHERE email = $1 AND wave = 'seed'`, [email]);
            if (sr.rows[0]) seedRows.push({ token: sr.rows[0].token, domain: doms[i].domain, step: 100 + idx * 10 + i });
        }

        await query(`UPDATE outreach_plan_days SET planned = $2 WHERE plan_date = $1`, [et.date, picks.length]);

        const nowMs = now.getTime();
        // Send window: 7:00 AM to 11:30 PM ET, every day. Contacts in later time zones start no earlier than 7:00 AM local.
        const windowEnd = zonedInstant(et.date, '23:30', ET).getTime();
        for (const p of picks) {
            const startEt = zonedInstant(et.date, '07:00', ET).getTime();
            const startLocal = zonedInstant(et.date, '07:00', p.tz || ET).getTime();
            const start = Math.max(startEt, startLocal);
            const endForPick = p.morning ? Math.min(Math.max(zonedInstant(et.date, '11:00', ET).getTime(), nowMs + 30 * 60_000), windowEnd) : windowEnd;
            const spanSec = Math.max(Math.floor((endForPick - start) / 1000), 60);
            let at = start + randomInt(0, spanSec) * 1000;
            if (at < nowMs) at = nowMs + randomInt(0, 20) * 60_000;
            await query(
                `INSERT INTO outreach_queue (plan_date, token, step, domain, scheduled_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (token, step) DO NOTHING`,
                [et.date, p.token, p.step, p.domain, new Date(Math.min(at, endForPick))]
            );
        }
        for (const sd of seedRows) {
            const start = zonedInstant(et.date, '09:00', ET);
            let at = start.getTime() + randomInt(0, 120) * 60_000;
            if (at < nowMs) at = nowMs + randomInt(1, 15) * 60_000;
            await query(
                `INSERT INTO outreach_queue (plan_date, token, step, domain, scheduled_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (token, step) DO NOTHING`,
                [et.date, sd.token, sd.step, sd.domain, new Date(at)]
            );
        }
        return { planned: picks.length + seedRows.length, budget, dayIndex: idx };
        } catch (err) {
            await query(`DELETE FROM outreach_queue WHERE plan_date = $1 AND state = 'pending'`, [et.date]);
            await query(`DELETE FROM outreach_plan_days WHERE plan_date = $1`, [et.date]);
            throw err;
        }
    }
}

// ---------- health gates ----------

export async function evaluateGates(): Promise<{ paused: string[]; globalPause: boolean }> {
    await ensureOutreachTables();
    const paused: string[] = [];
    const r = await query(`
        SELECT domain,
               COUNT(*) AS sent,
               COUNT(*) FILTER (WHERE status = 'bounced') AS bounced,
               COUNT(*) FILTER (WHERE complaint) AS complaints
        FROM outreach_sends
        WHERE sent_at > NOW() - INTERVAL '14 days' AND step < 100
        GROUP BY domain`);
    let totalSent = 0, totalComplaints = 0;
    for (const row of r.rows) {
        const sent = Number(row.sent), bounced = Number(row.bounced), complaints = Number(row.complaints);
        totalSent += sent; totalComplaints += complaints;
        let reason: string | null = null;
        if (sent >= 50 && bounced / sent > 0.02) reason = `hard bounce rate ${(bounced / sent * 100).toFixed(1)}% over ${sent} sends`;
        if (!reason && complaints >= 2 && complaints / sent > 0.001) reason = `complaint rate ${(complaints / sent * 100).toFixed(2)}% (${complaints} of ${sent})`;
        if (reason) {
            const u = await query(
                `UPDATE outreach_domains SET status = 'paused', paused_reason = $2, paused_at = NOW() WHERE domain = $1 AND status = 'active' RETURNING domain`,
                [row.domain, reason]
            );
            if (u.rowCount) { paused.push(`${row.domain}: ${reason}`); }
        }
    }
    let globalPause = false;
    if (totalSent >= 100 && totalComplaints >= 3 && totalComplaints / totalSent > 0.003) {
        await setSetting('paused', 'true');
        globalPause = true;
        paused.push(`ALL: complaint rate ${(totalComplaints / totalSent * 100).toFixed(2)}% (${totalComplaints} of ${totalSent})`);
    }
    if (paused.length) await sendAlert('Invitation sending paused', paused.join('\n'));
    return { paused, globalPause };
}

async function sendAlert(subject: string, body: string): Promise<void> {
    try {
        const s = await getSettings();
        const from = process.env.TRANSACTIONAL_FROM ?? 'TradeMind <signals@trademind.bot>';
        if (!RESEND_API_KEY || !s.alert_email) return;
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: s.alert_email, subject, text: body }),
        });
    } catch (e) { console.error('[outreach] alert failed', e); }
}

// ---------- sending ----------

async function sendOne(row: { id: number; token: string; step: number; domain: string }, s: Record<string, string>, fromLocal: string, transport: Transport): Promise<'sent' | 'skipped' | 'failed'> {
    const cr = await query(`SELECT token, email, first_name, template, wave, status, snooze_until, subscriber_email, age FROM outreach_contacts WHERE token = $1`, [row.token]);
    const c = cr.rows[0];
    if (c && isSeq7Row(row.step)) return sendSeq7(row, s, c, fromLocal, transport);
    const skip = async (note: string) => { await query(`UPDATE outreach_queue SET state = 'skipped', note = $2 WHERE id = $1`, [row.id, note]); return 'skipped' as const; };
    if (!c) return skip('no contact');
    const isSeed = c.wave === 'seed';
    const stage = STAGE_BY_STEP[row.step];
    const seqV2 = s.seq_v2 === 'true';
    let branch: 'C' | 'N' = 'N';
    if (!isSeed) {
        const blocked = ['unsubscribed', 'bounced', 'complained', 'subscribed', 'confirmed', 'monthly', 'checked_in'];
        if (!(stage && seqV2)) blocked.push('clicked');
        if (blocked.includes(c.status)) return skip(`status ${c.status}`);
        if (row.step === 1 && c.status !== 'pending') return skip(`status ${c.status}`);
        if (stage && !seqV2 && c.status !== 'sent') return skip(`status ${c.status}`);
        if (stage && seqV2 && !['sent', 'clicked'].includes(c.status)) return skip(`status ${c.status}`);
        if (stage && row.step !== 2 && !seqV2) return skip('sequence v2 off');
        if (row.step === 3 && (c.status !== 'snoozed' || !c.snooze_until || new Date(c.snooze_until).getTime() > Date.now())) return skip(`status ${c.status}`);
        if (c.status === 'snoozed' && row.step !== 3) return skip('snoozed');
        const sup = await query(`SELECT 1 FROM newsletter_suppression WHERE email = $1`, [c.email]);
        if (sup.rowCount) return skip('suppressed');
        if (stage && !seqV2) {
            const hc = await query(`SELECT 1 FROM outreach_click_events WHERE token = $1 AND human_confirmed LIMIT 1`, [row.token]);
            if (hc.rowCount) return skip('human click');
        }
        if (stage) {
            // Anyone who signed up (even with another address) or is on the newsletter list gets no more invitations.
            const sub = await query(
                `SELECT 1 FROM newsletter_subscribers WHERE status IN ('confirmed','pending') AND email = ANY($1::text[]) LIMIT 1`,
                [[String(c.email).toLowerCase(), String(c.subscriber_email ?? '').toLowerCase()].filter(Boolean)]
            );
            if (sub.rowCount) return skip('already subscribed');
            // Anyone who applied to, or joined, the founding program gets no more invitations.
            const applied = await query(
                `SELECT 1 FROM program_application WHERE email_norm = $1 UNION ALL SELECT 1 FROM program_participant WHERE email_norm = $1 LIMIT 1`,
                [String(c.email).toLowerCase()]
            ).catch(() => ({ rowCount: 0 }));
            if (applied.rowCount) return skip('applied to program');
        }
    }
    // Re-introduction: a person whose first email went out through Resend and who has not responded gets the new first
    // email (variant A or C, sent through SendGrid) in place of the old first follow-up. People who clicked keep the normal path.
    let reintro = false;
    if (!isSeed && row.step === 2 && transport === 'sendgrid' && c.status === 'sent') {
        const f1 = await query(`SELECT d.transport FROM outreach_sends s1 LEFT JOIN outreach_domains d ON d.domain = s1.domain WHERE s1.token = $1 AND s1.step = 1`, [row.token]);
        const hc = await query(`SELECT 1 FROM outreach_click_events WHERE token = $1 AND (human_confirmed OR NOT is_bot) LIMIT 1`, [row.token]);
        reintro = String(f1.rows[0]?.transport ?? 'resend') === 'resend' && !hc.rowCount;
    }
    if (stage) {
        // Branch C: any real (non bot) click on any tracked link, ever. Otherwise branch N.
        const ck = await query(`SELECT 1 FROM outreach_click_events WHERE token = $1 AND (NOT is_bot OR human_confirmed) LIMIT 1`, [row.token]);
        branch = ck.rowCount || c.status === 'clicked' ? 'C' : 'N';
    }
    const tmplStep: number = row.step >= 100 ? 1 : row.step;
    const baseOpts = {
        template: c.template, step: tmplStep, token: c.token, firstName: c.first_name,
        senderName: s.sender_name || 'Eric Huang', useHtml: s.html_enabled === 'true', branch, seqV2,
    };
    // Copy v6 (short plain-text notes with spintax) applies to emails sent from copy_v6_start onward, except the
    // control group, which keeps the earlier copy. Emails already sent are never touched.
    const v6Start = s.copy_v6_start ? Date.parse(s.copy_v6_start) : NaN;
    // Sample-first copy: steps 5 and 6 are the previewer emails (branch C), steps 2 and 7 the standard follow-ups (branch N).
    const v6Branch: 'C' | 'N' = row.step === 5 || row.step === 6 ? 'C' : 'N';
    const v6Live = Number.isFinite(v6Start) && Date.now() >= v6Start && !isV6Control(c.token);
    if (v6Live && stage && (row.step === 5 || row.step === 6) && !hasV6(c.template, tmplStep, 'C')) return skip('no copy');
    const useV6 = v6Live && (tmplStep === 1 || (seqV2 && !!stage)) && hasV6(c.template, tmplStep, tmplStep === 1 ? 'N' : v6Branch);
    let msg: { subject: string; text: string; html: string | null; unsubUrl: string };
    // Copy v8 (result block next to Subscribe, variants A and B) applies only to first emails sent after copy_v8_start. Unset means off.
    const v8Start = s.copy_v8_start ? Date.parse(s.copy_v8_start) : NaN;
    const v8Force = s.copy_v8_force === 'A' || s.copy_v8_force === 'B' || s.copy_v8_force === 'C' ? (s.copy_v8_force as 'A' | 'B' | 'C') : undefined;
    const v8cStart = s.copy_v8c_start ? Date.parse(s.copy_v8c_start) : NaN;
    const useC = Number.isFinite(v8cStart) && Date.now() >= v8cStart;
    const useV8 = tmplStep === 1 && !stage && Number.isFinite(v8Start) && Date.now() >= v8Start;
    // Waiting-story follow-up (chart image). Off unless copy_ws_start is set. Step 2 for people who got the new first email through
    // SendGrid and have not clicked; step 7 for people whose step 2 was the re-introduced first email.
    const wsStart = s.copy_ws_start ? Date.parse(s.copy_ws_start) : NaN;
    let useWS = false;
    if (Number.isFinite(wsStart) && Date.now() >= wsStart && stage && seqV2 && branch === 'N' && !reintro) {
        if (row.step === 2) useWS = true;
        else if (row.step === 7) {
            const s2 = await query(`SELECT template FROM outreach_sends WHERE token = $1 AND step = 2`, [row.token]);
            useWS = String(s2.rows[0]?.template ?? '').startsWith('RE_');
        }
    }
    // Six-email founding panel sequence (copy_prog_start): replaces the A/B/C first email. Its follow-ups go to the people who got it.
    const progStart = s.copy_prog_start ? Date.parse(s.copy_prog_start) : NaN;
    const progLive = Number.isFinite(progStart) && Date.now() >= progStart;
    // copy_prog_seed = 'true' lets only seed (test) contacts receive the sequence before the live start.
    const seedTest = isSeed && s.copy_prog_seed === 'true';
    const useProgFirst = tmplStep === 1 && !stage && (progLive || seedTest);
    let useProgFu = false;
    let useReintroS1 = false;
    let seqOffset = false;
    let seqN: number | null = null;
    if (stage && seqV2 && !isSeed) {
        const f1 = await query(`SELECT template, sent_at FROM outreach_sends WHERE token = $1 AND step = 1`, [row.token]);
        let member = String(f1.rows[0]?.template ?? '') === SEQ6_TEMPLATE;
        if (!member && progLive && f1.rows[0]?.sent_at && new Date(f1.rows[0].sent_at).getTime() < progStart) {
            const closed = await query(`SELECT 1 FROM outreach_sends WHERE token = $1 AND step = 7 AND template NOT LIKE 'S%' LIMIT 1`, [row.token]);
            member = !closed.rowCount;
        }
        if (member) {
            const t2r = await query(`SELECT template FROM outreach_sends WHERE token = $1 AND step = 2`, [row.token]);
            const t2 = String(t2r.rows[0]?.template ?? '');
            seqOffset = t2.startsWith('RE_') || t2 === SEQ6_REINTRO_LABEL;
            if (row.step === 2 && reintro) useReintroS1 = true;
            else if (seqOffset) {
                const li = (SEQ6_OFFSET_LADDER as readonly number[]).indexOf(row.step);
                if (li < 0) return skip('sequence does not use this step');
                seqN = li + 2;
                useProgFu = true;
            } else {
                if (!(SEQ6_STEPS as readonly number[]).includes(row.step) || row.step === 1) return skip('sequence does not use this step');
                seqN = null;
                useProgFu = true;
            }
        }
    } else if (stage && seedTest) {
        useProgFu = (SEQ6_STEPS as readonly number[]).includes(row.step);
    }
    let seqVisited: string[] = [];
    let seqAnswer: string | null = null;
    if ((useProgFu || useReintroS1) && !isSeed) {
        const vv = await query(`SELECT DISTINCT link_type FROM outreach_click_events WHERE token = $1 AND human_confirmed AND link_type LIKE 'sec\\_%'`, [row.token]);
        seqVisited = vv.rows.map((r: { link_type: string }) => String(r.link_type).slice(4));
        const an = await query(`SELECT value FROM start_response WHERE token = $1 AND kind = 'challenge' ORDER BY id DESC LIMIT 1`, [row.token]).catch(() => ({ rows: [] as { value: string }[] }));
        seqAnswer = an.rows[0]?.value ?? null;
    }
    let reVariant: string | null = null;
    const seqOpts = { token: c.token, firstName: c.first_name, baseUrl: BASE_URL, mailingAddress: MAILING_ADDRESS, sigSep: '-'.repeat(2), useHtml: s.html_enabled === 'true' };
    if (useProgFirst) {
        msg = renderSeq6({ ...seqOpts, step: 1 });
    } else if (useReintroS1) {
        msg = renderSeq6({ ...seqOpts, step: 1 });
    } else if (useProgFu) {
        msg = renderSeq6({ ...seqOpts, step: row.step, n: seqN ?? undefined, visited: seqVisited, answer: seqAnswer });
    } else if (useWS) {
        msg = renderWS({ token: c.token, firstName: c.first_name, baseUrl: BASE_URL, mailingAddress: MAILING_ADDRESS, sigSep: '-'.repeat(2), useHtml: s.html_enabled === 'true', step: row.step, last: row.step === 7 });
    } else if (reintro) {
        const m8 = renderV8({ token: c.token, firstName: c.first_name, baseUrl: BASE_URL, mailingAddress: MAILING_ADDRESS, sigSep: '-'.repeat(2), useHtml: s.html_enabled === 'true', useC });
        reVariant = m8.variant; msg = m8;
    } else if (useV8) {
        msg = renderV8({ token: c.token, firstName: c.first_name, baseUrl: BASE_URL, mailingAddress: MAILING_ADDRESS, sigSep: '-'.repeat(2), useHtml: s.html_enabled === 'true', force: isSeed ? v8Force : undefined, useC });
    } else if (useV6) {
        msg = renderV6({ template: c.template, step: tmplStep, branch: tmplStep === 1 ? 'N' : v6Branch, token: c.token, firstName: c.first_name, useHtml: s.html_enabled === 'true', baseUrl: BASE_URL, mailingAddress: MAILING_ADDRESS, sigSep: '-'.repeat(2) });
    } else {
        msg = renderInvite(baseOpts);
    }
    const from = `${s.from_display || 'Eric Huang From AI Investor Copilot'} <${fromLocal}@${row.domain}>`;
    let res;
    try {
        res = await sendMail({
            transport, from, to: c.email, replyTo: s.reply_to || undefined, subject: msg.subject, text: msg.text, html: msg.html,
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
    const data = { id: res.id ?? undefined };
    await query(
        `INSERT INTO outreach_sends (token, step, template, domain, from_addr, message_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (token, step) DO NOTHING`,
        [row.token, row.step, tmplStep === 3 ? 'CHECKIN' : useProgFirst ? SEQ6_TEMPLATE : useReintroS1 ? SEQ6_REINTRO_LABEL : useProgFu ? seq6Label(seqN ?? ({ 2: 2, 5: 3, 6: 4, 7: 5, 8: 6 } as Record<number, number>)[row.step]) : reVariant ? `RE_${reVariant}` : useWS ? 'WS' : stage ? (seqV2 ? `${stage}_${branch}` : 'FU') : c.template, row.domain, from, data.id ?? null]
    );
    await query(`UPDATE outreach_queue SET state = 'sent' WHERE id = $1`, [row.id]);
    if (!isSeed) {
        await query(`UPDATE outreach_contacts SET status = 'sent', updated_at = NOW() WHERE token = $1 AND status = 'pending'`, [row.token]);
        if (row.step === 3) await query(`UPDATE outreach_contacts SET status = 'checked_in', updated_at = NOW() WHERE token = $1 AND status = 'snoozed'`, [row.token]);
    }
    return 'sent';
}

export async function processDue(limit = 40, now = new Date()): Promise<Record<string, number | string>> {
    await ensureOutreachTables();
    const s = await getSettings();
    if (s.paused !== 'false') return { paused: 'true' };
    await evaluateGates();
    if ((await getSettings()).paused !== 'false') return { paused: 'true' };

    // Rows that missed their window by more than 3 hours go back to the pool.
    await query(`UPDATE outreach_queue SET state = 'expired' WHERE state = 'pending' AND scheduled_at < $1`, [new Date(now.getTime() - 3 * 3600_000)]);

    const doms = new Map((await query(`SELECT domain, from_local, status, transport FROM outreach_domains`)).rows.map((r) => [String(r.domain), r]));
    const active = [...doms.values()].filter((d) => d.status === 'active').map((d) => String(d.domain));

    const due = await query(
        `SELECT id, token, step, domain FROM outreach_queue WHERE state = 'pending' AND scheduled_at <= $1 ORDER BY scheduled_at ASC LIMIT $2`,
        [now, limit]
    );
    const counts = { sent: 0, skipped: 0, failed: 0, rerouted: 0 };
    const rows = due.rows as { id: number; token: string; step: number; domain: string }[];
    // Seven-email sequence rows send only inside their window: retail 9:00 AM to 11:00 PM ET daily, advisers 9:00 AM to 6:00 PM ET weekdays.
    for (let i = rows.length - 1; i >= 0; i--) { if (isSeq7Row(rows[i].step) && !(await seq7WindowOpen(rows[i], now))) rows.splice(i, 1); }
    // Paused domain: move to the active domain with the fewest pending rows.
    for (const r of rows) {
        if (!active.includes(r.domain) && active.length && !isSeq7Row(r.step)) {
            const pick = active[randomInt(0, active.length)];
            await query(`UPDATE outreach_queue SET domain = $2 WHERE id = $1`, [r.id, pick]);
            r.domain = pick; counts.rerouted++;
        }
    }
    // A domain whose provider key is not configured sends nothing; its rows stay pending.
    const keyed = (d: string) => transportKeyPresent((String(doms.get(d)?.transport ?? 'resend')) as Transport);
    const runnable = rows.filter((r) => active.includes(r.domain) && keyed(r.domain));
    if (rows.length && !runnable.length && active.length) return { error: 'provider key missing for active domains' };
    for (let i = 0; i < runnable.length; i += 5) {
        const batch = runnable.slice(i, i + 5);
        const res = await Promise.all(batch.map((r) => sendOne(r, s, String(doms.get(r.domain)?.from_local ?? 'eric'), (String(doms.get(r.domain)?.transport ?? 'resend')) as Transport)));
        for (const x of res) counts[x]++;
    }
    return counts;
}

// ---------- reporting ----------

export async function reportIfDue(now = new Date()): Promise<boolean> {
    const s = await getSettings();
    const et = etParts(now);
    if (s.paused !== 'false' || et.hour < 17 || s.last_report_date === et.date) return false;
    const plan = await query(`SELECT day_index, budget, planned FROM outreach_plan_days WHERE plan_date = $1`, [et.date]);
    if (!plan.rows[0]) return false;
    const day = await query(`
        SELECT s.domain, COUNT(*) AS sent,
               COUNT(*) FILTER (WHERE s.status = 'delivered') AS delivered,
               COUNT(*) FILTER (WHERE s.status = 'bounced') AS bounced,
               COUNT(*) FILTER (WHERE s.complaint) AS complaints
        FROM outreach_sends s WHERE (s.sent_at AT TIME ZONE 'America/New_York')::date = $1 GROUP BY s.domain ORDER BY s.domain`, [et.date]);
    const tot = await query(`
        SELECT COUNT(*) FILTER (WHERE status IN ('sent','delivered')) AS delivered_all,
               (SELECT COUNT(*) FROM outreach_click_events WHERE human_confirmed) AS human_clicks,
               (SELECT COUNT(*) FROM outreach_click_events WHERE is_bot) AS bot_clicks,
               (SELECT COUNT(*) FROM outreach_contacts WHERE status = 'subscribed') AS subscribed,
               (SELECT COUNT(*) FROM outreach_contacts WHERE status = 'confirmed') AS confirmed,
               (SELECT COUNT(*) FROM outreach_contacts WHERE status = 'unsubscribed') AS unsub,
               (SELECT COUNT(*) FROM outreach_contacts WHERE status = 'pending' AND wave <> 'seed') AS pending
        FROM outreach_sends WHERE step = 1`);
    const seg = await query(`
        SELECT c.segment, COUNT(*) FILTER (WHERE s.status IN ('sent','delivered')) AS delivered,
               COUNT(*) FILTER (WHERE c.status = 'confirmed') AS confirmed
        FROM outreach_contacts c JOIN outreach_sends s ON s.token = c.token AND s.step = 1
        WHERE c.wave = 'W1_pilot' GROUP BY c.segment ORDER BY c.segment`);
    const dom = await query(`SELECT domain, status, paused_reason FROM outreach_domains ORDER BY domain`);
    const fb = await query(`SELECT choice, COUNT(*)::int AS n FROM outreach_feedback WHERE ts > NOW() - INTERVAL '1 day' GROUP BY choice ORDER BY choice`);
    const snz = await query(`SELECT COUNT(*) FILTER (WHERE status = 'snoozed')::int AS snoozed, COUNT(*) FILTER (WHERE status = 'monthly')::int AS monthly FROM outreach_contacts`);
    const t = tot.rows[0];
    const lines = [
        `Invitation report for ${et.date}. Send day ${plan.rows[0].day_index}, budget ${plan.rows[0].budget}, planned ${plan.rows[0].planned}.`,
        '', 'Today by domain (sent / delivered / bounced / complaints):',
        ...day.rows.map((r) => `- ${r.domain}: ${r.sent} / ${r.delivered} / ${r.bounced} / ${r.complaints}`),
        '', `Totals: delivered or sent step 1 ${t.delivered_all}, human clicks ${t.human_clicks}, bot-filtered clicks ${t.bot_clicks}, subscribe submissions ${t.subscribed}, confirmed ${t.confirmed}, unsubscribed ${t.unsub}, contacts still pending ${t.pending}.`,
        '', 'Pilot gate by segment (delivered, confirmed, rate; needs 300 delivered and 1.5%):',
        ...seg.rows.map((r) => `- ${r.segment}: ${r.delivered}, ${r.confirmed}, ${Number(r.delivered) ? (Number(r.confirmed) / Number(r.delivered) * 100).toFixed(2) : '0.00'}%`),
        '', `Unsubscribe page choices in the last 24 hours: ${fb.rows.length ? fb.rows.map((r) => `${r.choice} ${r.n}`).join(', ') : 'none'}. Paused for a check-in: ${snz.rows[0].snoozed}. Asked for a monthly recap (nothing sent yet): ${snz.rows[0].monthly}.`,
        '', 'Domains:', ...dom.rows.map((r) => `- ${r.domain}: ${r.status}${r.paused_reason ? ` (${r.paused_reason})` : ''}`),
    ];
    await sendAlert(`Invitation report ${et.date}`, lines.join('\n'));
    await setSetting('last_report_date', et.date);
    return true;
}

export async function tick(): Promise<Record<string, unknown>> {
    const planned = await planToday();
    const sent = await processDue(40);
    let recaps: Record<string, number | string> = {};
    try { recaps = await processRecaps(15); } catch (e) { recaps = { error: (e as Error).message.slice(0, 120) }; }
    const reported = await reportIfDue();
    return { planned, sent, recaps, reported };
}
