/**
 * Tokenized invitation sender: daily planner, due-row sender, health gates and daily report.
 *
 * Transport: Resend, one verified sending subdomain per brand domain, plain text only,
 * no open or click tracking, links on trademind.bot, one-click unsubscribe headers.
 *
 * Ramp (set by Eric, Oct 2026): 100 sends on the first send day, +50 each send day, seven days a week,
 * spread across 8:00 AM to 8:00 PM ET.
 * Pilot wave first; each segment's rollout (W2) is released by the confirmed-rate gate.
 * Nothing sends while outreach_settings.paused = 'true'.
 */
import { randomInt } from 'crypto';
import { query } from '@/lib/db';
import { MAILING_ADDRESS } from '@/lib/newsletter/email';
import { INVITE_TEMPLATES } from './templates';
import { INVITE_TEMPLATES_V5 } from './templates-v5';
import { processRecaps } from './recap';
import { BASE_URL, CAMPAIGN, ensureOutreachTables, getSettings, setSetting } from './db';

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

/** Sends run seven days a week; only the listed holidays are skipped. */
export function isSendDay(date: string, _dow: number): boolean {
    return !HOLIDAYS.has(date);
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
    template: string; step: 1 | 2 | 3; token: string; firstName: string | null; senderName: string; useHtml?: boolean;
}): { subject: string; text: string; html: string | null; unsubUrl: string } {
    const key = opts.step === 3 ? 'CHECKIN' : opts.step === 2 ? 'FU' : opts.template;
    const v5 = INVITE_TEMPLATES_V5[key];
    const legacy = INVITE_TEMPLATES[key];
    // v5 (HTML plus plain text, new subjects) only when switched on; the check-in only exists in v5.
    const useV5 = !!v5 && (opts.useHtml === true || key === 'CHECKIN');
    const t = useV5 ? v5 : legacy;
    if (!t) throw new Error(`Unknown template ${key}`);
    const unsubUrl = `${BASE_URL}/u/${opts.token}`;
    const first = (opts.firstName ?? '').trim();
    const map: Record<string, string> = {
        first_name: first || 'there',
        preview_url: `${BASE_URL}/r/${opts.token}/p?s=${opts.step}`,
        subscribe_url: `${BASE_URL}/r/${opts.token}/s?s=${opts.step}`,
        unsub_url: unsubUrl,
        sender_name: opts.senderName,
        mailing_address: MAILING_ADDRESS,
        sig_sep: '-'.repeat(2),
    };
    const fill = (src: string, esc: boolean) => src.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => esc ? escHtml(map[k] ?? '') : (map[k] ?? ''));
    const subject = useV5 ? fillSubject(t.subject, first) : t.subject;
    const text = fill(t.body, false);
    const html = useV5 && v5.html && opts.useHtml === true ? fill(v5.html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(subject)}</title>`), true) : null;
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

async function activeDomains(): Promise<{ domain: string; from_local: string; weight: number }[]> {
    const r = await query(`SELECT domain, from_local, weight::float AS weight FROM outreach_domains WHERE status = 'active' ORDER BY domain`);
    return r.rows as { domain: string; from_local: string; weight: number }[];
}

export async function planToday(now = new Date()): Promise<PlanResult | null> {
    await ensureOutreachTables();
    const s = await getSettings();
    if (s.paused !== 'false') return null;
    const et = etParts(now);
    if (!s.start_date || et.date < s.start_date) return null;
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
        const doms = await activeDomains();
        if (!doms.length) return { planned: 0, budget, dayIndex: idx, reason: 'no active domains' };

        // Expired leftovers from earlier days go back to the pool.
        await query(`DELETE FROM outreach_queue WHERE state IN ('pending','expired') AND plan_date < $1`, [et.date]);

        const totalW = doms.reduce((a, d) => a + d.weight, 0);
        const cap = new Map<string, number>();
        let assigned = 0;
        doms.forEach((d, i) => {
            const c = i === doms.length - 1 ? budget - assigned : Math.round((budget * d.weight) / totalW);
            cap.set(d.domain, Math.max(c, 0)); assigned += Math.max(c, 0);
        });

        const gap = Number(s.followup_gap_days || 6);
        // Follow-ups: step 1 sent at least `gap` days ago, still status 'sent' (no human click, no bounce, no unsub).
        const fu = await query(`
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

        const picks: { token: string; tz: string; domain: string; step: number }[] = [];
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
        const fuCap = Math.floor(budget * 0.55);
        for (const row of fu.rows) {
            if (picks.length >= fuCap) break;
            let d = String(row.domain);
            if (!cap.has(d)) d = doms.map((x) => x.domain).sort((a, b) => room(b) - room(a))[0];
            if (room(d) <= 0) continue;
            picks.push({ token: row.token, tz: row.tz, domain: d, step: 2 });
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
        // Send window: 8:00 AM to 8:00 PM ET. Contacts in earlier time zones start no earlier than 7:00 AM local.
        const windowEnd = zonedInstant(et.date, '20:00', ET).getTime();
        for (const p of picks) {
            const startEt = zonedInstant(et.date, '08:00', ET).getTime();
            const startLocal = zonedInstant(et.date, '07:00', p.tz || ET).getTime();
            const start = Math.max(startEt, startLocal);
            const spanSec = Math.max(Math.floor((windowEnd - start) / 1000), 60);
            let at = start + randomInt(0, spanSec) * 1000;
            if (at < nowMs) at = nowMs + randomInt(0, 20) * 60_000;
            await query(
                `INSERT INTO outreach_queue (plan_date, token, step, domain, scheduled_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (token, step) DO NOTHING`,
                [et.date, p.token, p.step, p.domain, new Date(Math.min(at, windowEnd))]
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

async function sendOne(row: { id: number; token: string; step: number; domain: string }, s: Record<string, string>, fromLocal: string): Promise<'sent' | 'skipped' | 'failed'> {
    const cr = await query(`SELECT token, email, first_name, template, wave, status, snooze_until FROM outreach_contacts WHERE token = $1`, [row.token]);
    const c = cr.rows[0];
    const skip = async (note: string) => { await query(`UPDATE outreach_queue SET state = 'skipped', note = $2 WHERE id = $1`, [row.id, note]); return 'skipped' as const; };
    if (!c) return skip('no contact');
    const isSeed = c.wave === 'seed';
    if (!isSeed) {
        if (['unsubscribed', 'bounced', 'complained', 'subscribed', 'confirmed', 'clicked', 'monthly', 'checked_in'].includes(c.status)) return skip(`status ${c.status}`);
        if (row.step === 1 && c.status !== 'pending') return skip(`status ${c.status}`);
        if (row.step === 2 && c.status !== 'sent') return skip(`status ${c.status}`);
        if (row.step === 3 && (c.status !== 'snoozed' || !c.snooze_until || new Date(c.snooze_until).getTime() > Date.now())) return skip(`status ${c.status}`);
        if (c.status === 'snoozed' && row.step !== 3) return skip('snoozed');
        const sup = await query(`SELECT 1 FROM newsletter_suppression WHERE email = $1`, [c.email]);
        if (sup.rowCount) return skip('suppressed');
        if (row.step === 2) {
            const hc = await query(`SELECT 1 FROM outreach_click_events WHERE token = $1 AND human_confirmed LIMIT 1`, [row.token]);
            if (hc.rowCount) return skip('human click');
        }
    }
    const tmplStep: 1 | 2 | 3 = row.step === 3 ? 3 : row.step === 2 ? 2 : 1;
    const msg = renderInvite({
        template: c.template, step: tmplStep, token: c.token, firstName: c.first_name,
        senderName: s.sender_name || 'Eric Huang', useHtml: s.html_enabled === 'true',
    });
    const from = `${s.sender_name || 'Eric Huang'} <${fromLocal}@${row.domain}>`;
    let resp: Response;
    try {
        resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `outreach-${row.token}-${row.step}` },
            body: JSON.stringify({
                from, to: [c.email], reply_to: s.reply_to || undefined, subject: msg.subject, text: msg.text, ...(msg.html ? { html: msg.html } : {}),
                headers: { 'List-Unsubscribe': `<${msg.unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
                tags: [{ name: 'campaign', value: CAMPAIGN }, { name: 'step', value: String(row.step >= 100 ? 0 : row.step) }],
            }),
        });
    } catch (e) {
        await query(`UPDATE outreach_queue SET note = $2 WHERE id = $1`, [row.id, `network: ${(e as Error).message}`.slice(0, 200)]);
        return 'failed';
    }
    if (!resp.ok) {
        const body = (await resp.text()).slice(0, 300);
        const permanent = resp.status === 422 || resp.status === 400;
        await query(`UPDATE outreach_queue SET state = $2, note = $3 WHERE id = $1`, [row.id, permanent ? 'failed' : 'pending', `resend ${resp.status}: ${body}`]);
        return 'failed';
    }
    const data = (await resp.json()) as { id?: string };
    await query(
        `INSERT INTO outreach_sends (token, step, template, domain, from_addr, message_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (token, step) DO NOTHING`,
        [row.token, row.step, tmplStep === 3 ? 'CHECKIN' : tmplStep === 2 ? 'FU' : c.template, row.domain, from, data.id ?? null]
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
    if (!RESEND_API_KEY) return { error: 'RESEND_API_KEY missing' };
    await evaluateGates();
    if ((await getSettings()).paused !== 'false') return { paused: 'true' };

    // Rows that missed their window by more than 3 hours go back to the pool.
    await query(`UPDATE outreach_queue SET state = 'expired' WHERE state = 'pending' AND scheduled_at < $1`, [new Date(now.getTime() - 3 * 3600_000)]);

    const doms = new Map((await query(`SELECT domain, from_local, status FROM outreach_domains`)).rows.map((r) => [String(r.domain), r]));
    const active = [...doms.values()].filter((d) => d.status === 'active').map((d) => String(d.domain));

    const due = await query(
        `SELECT id, token, step, domain FROM outreach_queue WHERE state = 'pending' AND scheduled_at <= $1 ORDER BY scheduled_at ASC LIMIT $2`,
        [now, limit]
    );
    const counts = { sent: 0, skipped: 0, failed: 0, rerouted: 0 };
    const rows = due.rows as { id: number; token: string; step: number; domain: string }[];
    // Paused domain: move to the active domain with the fewest pending rows.
    for (const r of rows) {
        if (!active.includes(r.domain) && active.length) {
            const pick = active[randomInt(0, active.length)];
            await query(`UPDATE outreach_queue SET domain = $2 WHERE id = $1`, [r.id, pick]);
            r.domain = pick; counts.rerouted++;
        }
    }
    const runnable = rows.filter((r) => active.includes(r.domain));
    for (let i = 0; i < runnable.length; i += 5) {
        const batch = runnable.slice(i, i + 5);
        const res = await Promise.all(batch.map((r) => sendOne(r, s, String(doms.get(r.domain)?.from_local ?? 'eric'))));
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
