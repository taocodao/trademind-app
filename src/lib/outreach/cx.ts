/**
 * Custom adviser outreach ("cx") for the Consulti contact list: import, drafts, and the scheduled sender.
 *
 * Isolated from the retail and RIA sequences: contacts use wave 'cx', segment 'consulti' and stay at status 'pending' while active,
 * sends use steps 41 to 44 in outreach_sends, and the master switch is the setting cx_enabled (default 'false').
 * Unsubscribe, click tracking and delivery webhooks reuse the existing token routes and outreach_sends.message_id matching.
 * Nothing here connects to a brokerage.
 */
import { randomBytes } from 'crypto';
import pool, { query } from '@/lib/db';
import { BASE_URL, ensureOutreachTables, getSettings, setSetting } from './db';
import { sendMail } from './transport';
import { etParts, isBusinessDay } from './sender';
import { MAILING_ADDRESS } from '@/lib/newsletter/email';
import { buildDrafts, buildProfile, renderCx, type CxRaw } from './cx-copy';

export const CX_STEP0 = 40;                       // steps 41 to 44
export const CX_BDAYS = [0, 4, 9, 16];             // business days after the first email for emails 1 to 4
const MIN_GAP_BDAYS = 2;
const FIRM_GAP_DAYS = 7;
const BLOCKED = `'unsubscribed','bounced','complained','subscribed','confirmed','monthly','checked_in','snoozed','replied','stopped'`;
const FIRM_STOP = `'unsubscribed','complained','replied','stopped'`;
export const CX_TEST_ALLOW = new Set(['web3aistore@gmail.com', 'web3aistore1@gmail.com', 'web3aistore2@gmail.com', 'web3aistore3@gmail.com', 'web3aistore4@gmail.com', 'testtrademind@gmail.com', 'testtrademindnewsletter@gmail.com', 'testtrademindspam1@gmail.com', 'ericyaohuang@gmail.com', 'erichuang2005@gmail.com', 'erichuang2005@yahoo.com', 'erichuang2005@aol.com', 'eric@vochat.ai', 'eric@vochat.com', 'eric@arenza.tv', 'eric@trademind.bot', 'eric@taocodao.com', 'testtrademind@outlook.com', 'cyberstoremgr@gmail.com', 'ehuang1234@gmail.com', 'omniagenthub@gmail.com', 'zhenyingsun2024@gmail.com', 'testtrademind@yahoo.com', 'cyberstoremgr@yahoo.com']);

export const CX_DEFAULTS: [string, string][] = [
    ['cx_enabled', 'false'], ['cx_domains', 'arenza.tv,update.trademind.bot,taocodao.com'],
    ['cx_start', '20'], ['cx_step', '10'], ['cx_cap', '120'], ['cx_total_cap', '400'],
    ['cx_from_display', 'Eric Huang'], ['cx_reply_to', ''],
];

let ready = false;
export async function ensureCxTables(): Promise<void> {
    if (ready) return;
    await ensureOutreachTables();
    await query(`CREATE TABLE IF NOT EXISTS cx_batches (id SERIAL PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), total INT NOT NULL DEFAULT 0, imported INT NOT NULL DEFAULT 0, summary JSONB)`);
    await query(`CREATE TABLE IF NOT EXISTS cx_profile (
        token TEXT PRIMARY KEY REFERENCES outreach_contacts(token), batch_id INT, firm TEXT, firm_key TEXT, title TEXT, website TEXT, linkedin TEXT,
        city TEXT, state TEXT, employees TEXT, keywords TEXT, identity_ok BOOLEAN NOT NULL DEFAULT FALSE, hook_id TEXT, hook TEXT,
        hold BOOLEAN NOT NULL DEFAULT FALSE, hold_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE INDEX IF NOT EXISTS cx_profile_firm_idx ON cx_profile (firm_key)`);
    await query(`CREATE TABLE IF NOT EXISTS cx_draft (token TEXT NOT NULL REFERENCES outreach_contacts(token), step INT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, words INT NOT NULL, errors TEXT, PRIMARY KEY (token, step))`);
    for (const [k, v] of CX_DEFAULTS) await query(`INSERT INTO outreach_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [k, v]);
    ready = true;
}

// ---------- file parsing ----------

export function parseCsv(text: string): string[][] {
    const rows: string[][] = []; let row: string[] = []; let cur = ''; let q = false;
    const t = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
        else if (ch === '"') q = true;
        else if (ch === ',') { row.push(cur); cur = ''; }
        else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((c) => c !== '')) rows.push(row); row = []; }
        else cur += ch;
    }
    row.push(cur); if (row.some((c) => c !== '')) rows.push(row);
    return rows;
}

export async function parseListFile(name: string, buf: ArrayBuffer): Promise<Record<string, string>[]> {
    let grid: unknown[][];
    if (/\.xlsx$/i.test(name)) {
        const { readSheet } = await import('read-excel-file/universal');
        grid = (await readSheet(buf)) as unknown[][];
    } else grid = parseCsv(new TextDecoder().decode(buf));
    if (grid.length < 2) return [];
    const head = grid[0].map((h) => String(h ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    return grid.slice(1).map((r) => { const o: Record<string, string> = {}; head.forEach((h, i) => { if (h) o[h] = r[i] == null ? '' : String(r[i]).trim(); }); return o; });
}

// ---------- import ----------

const ROLE_LOCAL = /^(info|admin|office|support|contact|hello|sales|team|service|services|mail|enquiries|inquiries|marketing|billing|help|noreply|no-reply)$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOD = new Set(['good', 'valid', 'verified', 'deliverable']);

export interface ImportSummary {
    rows: number; accepted: number; imported: number; held: number;
    skipped: Record<string, number>; hooks: Record<string, number>; committed: boolean;
    sample: { email: string; firm: string; hook: string; subject: string; body: string }[];
}

export async function importCx(rows: Record<string, string>[], opts: { name: string; commit: boolean }): Promise<ImportSummary> {
    await ensureCxTables();
    const sum: ImportSummary = { rows: rows.length, accepted: 0, imported: 0, held: 0, skipped: { not_good_status: 0, invalid_email: 0, role_address: 0, duplicate_in_file: 0, already_in_system: 0, suppressed_or_subscribed: 0 }, hooks: {}, committed: opts.commit, sample: [] };
    const seen = new Set<string>(); const cand: CxRaw[] = [];
    for (const r of rows) {
        const email = String(r.email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) { sum.skipped.invalid_email++; continue; }
        if (r.email_status && !GOOD.has(r.email_status.toLowerCase())) { sum.skipped.not_good_status++; continue; }
        if (ROLE_LOCAL.test(email.split('@')[0])) { sum.skipped.role_address++; continue; }
        if (seen.has(email)) { sum.skipped.duplicate_in_file++; continue; }
        seen.add(email); cand.push({ ...(r as unknown as CxRaw), email });
    }
    // Remove anyone already known or who must not be contacted.
    const emails = cand.map((c) => c.email);
    const known = new Set<string>(); const blocked = new Set<string>();
    for (let i = 0; i < emails.length; i += 500) {
        const part = emails.slice(i, i + 500);
        for (const x of (await query(`SELECT LOWER(email) AS e FROM outreach_contacts WHERE LOWER(email) = ANY($1::text[])`, [part])).rows) known.add(x.e);
        for (const q of [
            `SELECT LOWER(email) AS e FROM newsletter_suppression WHERE LOWER(email) = ANY($1::text[])`,
            `SELECT LOWER(email) AS e FROM newsletter_subscribers WHERE LOWER(email) = ANY($1::text[])`,
            `SELECT email_norm AS e FROM program_application WHERE email_norm = ANY($1::text[])`,
            `SELECT email_norm AS e FROM program_participant WHERE email_norm = ANY($1::text[])`,
        ]) { try { for (const x of (await query(q, [part])).rows) blocked.add(x.e); } catch { /* table may not exist */ } }
    }
    const fresh: CxRaw[] = [];
    for (const c of cand) {
        if (known.has(c.email)) sum.skipped.already_in_system++;
        else if (blocked.has(c.email)) sum.skipped.suppressed_or_subscribed++;
        else fresh.push(c);
    }
    sum.accepted = fresh.length;
    const built = fresh.map((c) => {
        const token = randomBytes(8).toString('base64url').slice(0, 10);
        const p = buildProfile(c);
        const drafts = buildDrafts(p, token);
        const errors = drafts.flatMap((d) => d.errors.map((e) => `E${d.step}: ${e}`));
        return { token, p, drafts, errors };
    });
    for (const b of built) { sum.hooks[b.p.hookId] = (sum.hooks[b.p.hookId] || 0) + 1; if (b.errors.length) sum.held++; }
    for (const b of built.slice(0, 3)) sum.sample.push({ email: b.p.email, firm: b.p.firm, hook: b.p.hookId, subject: b.drafts[0].subject, body: b.drafts[0].body });
    if (!opts.commit || !built.length) return sum;

    const batch = (await query(`INSERT INTO cx_batches (name, total, imported, summary) VALUES ($1,$2,0,$3) RETURNING id`, [opts.name, rows.length, JSON.stringify({ skipped: sum.skipped })])).rows[0].id as number;
    for (let i = 0; i < built.length; i += 200) {
        const part = built.slice(i, i + 200);
        const ins = await query(
            `INSERT INTO outreach_contacts (token, email, first_name, st, segment, template, wave, tz, status)
             SELECT t, e, f, s, 'consulti', 'CX_A', 'cx', 'America/New_York', 'pending'
             FROM unnest($1::text[], $2::text[], $3::text[], $4::text[]) AS u(t, e, f, s)
             ON CONFLICT (email) DO NOTHING RETURNING token`,
            [part.map((b) => b.token), part.map((b) => b.p.email), part.map((b) => b.p.firstName), part.map((b) => b.p.state.slice(0, 40))]);
        const ok = new Set(ins.rows.map((r) => String(r.token)));
        const keep = part.filter((b) => ok.has(b.token));
        if (!keep.length) continue;
        await query(
            `INSERT INTO cx_profile (token, batch_id, firm, firm_key, title, website, linkedin, city, state, employees, keywords, identity_ok, hook_id, hook, hold, hold_reason)
             SELECT * FROM unnest($1::text[], $2::int[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[], $11::text[], $12::bool[], $13::text[], $14::text[], $15::bool[], $16::text[])`,
            [keep.map((b) => b.token), keep.map(() => batch), keep.map((b) => b.p.firm), keep.map((b) => b.p.firmKey), keep.map((b) => b.p.title), keep.map((b) => b.p.website), keep.map((b) => b.p.linkedin), keep.map((b) => b.p.city), keep.map((b) => b.p.state), keep.map((b) => b.p.employees), keep.map((b) => b.p.keywords.slice(0, 40).join('; ')), keep.map((b) => b.p.identityOk), keep.map((b) => b.p.hookId), keep.map((b) => b.p.hook), keep.map((b) => b.errors.length > 0), keep.map((b) => b.errors.join(' | ') || null)]);
        const flat = keep.flatMap((b) => b.drafts.map((d) => ({ token: b.token, d })));
        await query(
            `INSERT INTO cx_draft (token, step, subject, body, words, errors)
             SELECT * FROM unnest($1::text[], $2::int[], $3::text[], $4::text[], $5::int[], $6::text[]) ON CONFLICT DO NOTHING`,
            [flat.map((x) => x.token), flat.map((x) => x.d.step), flat.map((x) => x.d.subject), flat.map((x) => x.d.body), flat.map((x) => x.d.words), flat.map((x) => x.d.errors.join(' | ') || null as unknown as string)]);
        sum.imported += keep.length;
    }
    await query(`UPDATE cx_batches SET imported = $2, summary = $3 WHERE id = $1`, [batch, sum.imported, JSON.stringify(sum)]);
    return sum;
}

// ---------- Resend domain state ----------

let domCache: { at: number; map: Record<string, string> } | null = null;
export async function resendDomains(force = false): Promise<Record<string, string>> {
    if (!force && domCache && Date.now() - domCache.at < 10 * 60_000) return domCache.map;
    const key = process.env.RESEND_API_KEY;
    if (!key) return {};
    try {
        const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } });
        const j = (await r.json()) as { data?: { id: string; name: string; status: string }[] };
        const map: Record<string, string> = {};
        for (const d of j.data ?? []) map[d.name.toLowerCase()] = d.status;
        domCache = { at: Date.now(), map };
        return map;
    } catch { return domCache?.map ?? {}; }
}

export async function verifyResendDomains(names: string[]): Promise<Record<string, string>> {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { error: 'no Resend key' };
    const list = (await (await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } })).json()) as { data?: { id: string; name: string }[] };
    const out: Record<string, string> = {};
    for (const n of names) {
        const d = (list.data ?? []).find((x) => x.name.toLowerCase() === n);
        if (!d) { out[n] = 'not in Resend'; continue; }
        const r = await fetch(`https://api.resend.com/domains/${d.id}/verify`, { method: 'POST', headers: { Authorization: `Bearer ${key}` } });
        out[n] = r.ok ? 'verification requested' : `error ${r.status}`;
    }
    domCache = null;
    return out;
}

// ---------- scheduling helpers ----------

function addDays(date: string, n: number): string { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function bdaysBetween(from: string, to: string): number {
    let n = 0; let d = from;
    for (let i = 0; i < 400 && d < to; i++) { d = addDays(d, 1); const dow = new Date(`${d}T12:00:00Z`).getUTCDay(); if (isBusinessDay(d, dow)) n++; }
    return n;
}
const etDate = (v: unknown) => etParts(new Date(String(v))).date;

export interface DomainState { domain: string; verified: boolean; paused: string | null; budget: number; sentToday: number; sent14: number; bounced14: number; complaints14: number }

export async function domainStates(s: Record<string, string>, today: string): Promise<DomainState[]> {
    const doms = String(s.cx_domains || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const verified = await resendDomains();
    const start = Number(s.cx_start) || 20, step = Number(s.cx_step) || 10, cap = Number(s.cx_cap) || 120;
    const out: DomainState[] = [];
    for (const d of doms) {
        const a = (await query(
            `SELECT COUNT(DISTINCT (sent_at AT TIME ZONE 'America/New_York')::date) FILTER (WHERE (sent_at AT TIME ZONE 'America/New_York')::date < $2::date)::int AS days,
                    COUNT(*) FILTER (WHERE (sent_at AT TIME ZONE 'America/New_York')::date = $2::date)::int AS today,
                    COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '14 days')::int AS s14,
                    COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '14 days' AND sent_at < NOW() - INTERVAL '1 hour' AND (status = 'bounced' OR bounce_type IS NOT NULL))::int AS b14,
                    COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '14 days' AND complaint)::int AS c14
             FROM outreach_sends WHERE domain = $1 AND step BETWEEN 41 AND 44`, [d, today])).rows[0];
        const s14 = Number(a.s14), b14 = Number(a.b14), c14 = Number(a.c14);
        let paused: string | null = s[`cx_pause_${d}`] || null;
        if (!paused && c14 >= 1) paused = 'complaint';
        if (!paused && s14 >= 50 && b14 / s14 >= 0.01) paused = `bounce rate ${(100 * b14 / s14).toFixed(1)} percent`;
        if (paused && !s[`cx_pause_${d}`]) await setSetting(`cx_pause_${d}`, paused);
        out.push({ domain: d, verified: verified[d] === 'verified', paused, budget: Math.min(cap, start + step * Number(a.days)), sentToday: Number(a.today), sent14: s14, bounced14: b14, complaints14: c14 });
    }
    return out;
}

// ---------- the sender ----------

interface Cand { token: string; email: string; first_name: string | null; step: number; domain: string | null }

const BLOCK_SQL = `
    c.status NOT IN (${BLOCKED})
    AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
    AND NOT EXISTS (SELECT 1 FROM newsletter_subscribers sub WHERE sub.status IN ('confirmed','pending') AND sub.email IN (c.email, COALESCE(c.subscriber_email, c.email)))
    AND NOT EXISTS (SELECT 1 FROM program_application pa WHERE pa.email_norm = LOWER(c.email))
    AND NOT EXISTS (SELECT 1 FROM program_participant pp WHERE pp.email_norm = LOWER(c.email))
    AND NOT EXISTS (SELECT 1 FROM cx_profile p2 JOIN outreach_contacts c2 ON c2.token = p2.token
                    WHERE p2.firm_key = p.firm_key AND p.firm_key <> '' AND (c2.status IN (${FIRM_STOP}) OR EXISTS (SELECT 1 FROM outreach_sends z WHERE z.token = c2.token AND z.complaint)))`;

export async function processCx(now = new Date(), maxPerTick = 20): Promise<Record<string, number | string>> {
    await ensureCxTables();
    const s = await getSettings();
    if (s.cx_enabled !== 'true') return { cx: 'off' };
    const et = etParts(now);
    if (!isBusinessDay(et.date, et.dow)) return { cx: 'not a business day' };
    const mins = et.hour * 60 + et.minute;
    if (mins < 9 * 60 || mins >= 18 * 60) return { cx: 'outside window' };

    const client = await pool.connect();
    try {
        const lock = await client.query(`SELECT pg_try_advisory_lock(7410044) AS ok`);
        if (!lock.rows[0].ok) return { cx: 'busy' };
        try { return await run(s, et, now, maxPerTick); }
        finally { await client.query(`SELECT pg_advisory_unlock(7410044)`); }
    } finally { client.release(); }
}

async function run(s: Record<string, string>, et: { date: string; hour: number; minute: number; dow: number }, now: Date, maxPerTick: number): Promise<Record<string, number | string>> {
    const states = await domainStates(s, et.date);
    const usable = states.filter((d) => d.verified && !d.paused && !!process.env.RESEND_API_KEY);
    const out: Record<string, number | string> = { sent: 0, skipped: 0, failed: 0, domains: usable.length };
    if (!usable.length) { out.cx = 'no usable domain'; return out; }
    const frac = Math.min(1, (et.hour * 60 + et.minute - 540) / 540 + 0.05);
    const totalCap = Number(s.cx_total_cap) || 400;
    let sentAll = states.reduce((a, d) => a + d.sentToday, 0);
    const room = new Map<string, number>();
    for (const d of usable) room.set(d.domain, Math.max(0, Math.min(d.budget, Math.ceil(d.budget * frac)) - d.sentToday));
    let want = Math.min(maxPerTick, totalCap - sentAll, [...room.values()].reduce((a, b) => a + b, 0));
    if (want <= 0) return out;

    // Follow-ups due (same domain as the first email when it is usable).
    const fu = (await query(
        `SELECT c.token, c.email, c.first_name, MAX(x.step)::int AS last_step, MIN(x.sent_at) AS first_at, MAX(x.sent_at) AS last_at, (array_agg(x.domain ORDER BY x.step))[1] AS domain
         FROM outreach_contacts c JOIN cx_profile p ON p.token = c.token
         JOIN outreach_sends x ON x.token = c.token AND x.step BETWEEN 41 AND 44 AND x.status <> 'failed'
         WHERE c.wave = 'cx' AND ${BLOCK_SQL}
         GROUP BY c.token, c.email, c.first_name, p.firm_key HAVING MAX(x.step) < 44
         ORDER BY MIN(x.sent_at) LIMIT 400`)).rows;
    const cands: Cand[] = [];
    for (const r of fu) {
        const n = Number(r.last_step) - CX_STEP0;       // emails already sent
        const sinceFirst = bdaysBetween(etDate(r.first_at), et.date), sinceLast = bdaysBetween(etDate(r.last_at), et.date);
        if (sinceFirst >= CX_BDAYS[n] && sinceLast >= MIN_GAP_BDAYS) cands.push({ token: r.token, email: r.email, first_name: r.first_name, step: CX_STEP0 + n + 1, domain: r.domain });
    }
    // New first emails: one contact per firm per tick, none if the firm had a first email in the last 7 days.
    if (cands.length < want) {
        const nw = (await query(
            `SELECT c.token, c.email, c.first_name, p.firm_key FROM outreach_contacts c JOIN cx_profile p ON p.token = c.token
             WHERE c.wave = 'cx' AND c.status IN ('pending','clicked') AND NOT p.hold AND ${BLOCK_SQL}
               AND NOT EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step = 41)
               AND (p.firm_key = '' OR NOT EXISTS (SELECT 1 FROM cx_profile p3 JOIN outreach_sends y ON y.token = p3.token AND y.step = 41
                    WHERE p3.firm_key = p.firm_key AND y.sent_at > NOW() - make_interval(days => $2)))
             ORDER BY md5(c.token) LIMIT $1`, [(want - cands.length) * 4 + 8, FIRM_GAP_DAYS])).rows;
        const firms = new Set<string>();
        for (const r of nw) {
            if (cands.length >= want) break;
            if (r.firm_key) { if (firms.has(r.firm_key)) continue; firms.add(r.firm_key); }
            cands.push({ token: r.token, email: r.email, first_name: r.first_name, step: 41, domain: null });
        }
    }
    for (const c of cands) {
        if (want <= 0) break;
        // Choose the domain: the first email's domain for a follow-up, else the usable domain with the most room.
        let dom = c.domain && room.get(c.domain.toLowerCase()) ? c.domain.toLowerCase() : null;
        if (!dom) { const best = [...room.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]; dom = best ? best[0] : null; }
        if (!dom || !(room.get(dom) ?? 0)) continue;
        const r = await sendCxOne(c, dom, s);
        out[r] = Number(out[r]) + 1;
        if (r === 'sent') { room.set(dom, (room.get(dom) ?? 1) - 1); want--; sentAll++; }
    }
    void now;
    return out;
}

async function linkBaseFor(domain: string, s: Record<string, string>): Promise<string> {
    const h = s[`link_host_${domain.toLowerCase()}`];
    return h ? `https://${h}` : BASE_URL;
}

export async function sendCxOne(c: Cand, domain: string, s: Record<string, string>): Promise<'sent' | 'skipped' | 'failed'> {
    const dr = (await query(`SELECT subject, body, errors FROM cx_draft WHERE token = $1 AND step = $2`, [c.token, c.step - CX_STEP0])).rows[0];
    if (!dr || dr.errors) { if (c.step === 41) await query(`UPDATE cx_profile SET hold = TRUE, hold_reason = COALESCE(hold_reason, 'draft missing') WHERE token = $1`, [c.token]); return 'skipped'; }
    const base = await linkBaseFor(domain, s);
    const msg = renderCx({ step: c.step - CX_STEP0, subject: dr.subject, body: dr.body }, { token: c.token, linkBase: base, unsubUrl: `${base}/u/${c.token}`, mailingAddress: MAILING_ADDRESS });
    const from = `${s.cx_from_display || 'Eric Huang'} <eric@${domain}>`;
    let res;
    try {
        res = await sendMail({
            transport: 'resend', from, to: c.email, replyTo: s.cx_reply_to || s.reply_to || undefined, subject: msg.subject, text: msg.text,
            headers: { 'List-Unsubscribe': `<${base}/u/${c.token}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
            token: c.token, step: c.step, campaign: 'cx_adviser', idempotencyKey: `cx-${c.token}-${c.step}`,
        });
    } catch { return 'failed'; }
    if (!res.ok) {
        if (res.permanent) {
            await query(`INSERT INTO outreach_sends (token, step, template, domain, from_addr, status, error) VALUES ($1,$2,$3,$4,$5,'failed',$6) ON CONFLICT (token, step) DO NOTHING`, [c.token, c.step, `CX_A_${c.step - CX_STEP0}`, domain, from, `${res.status}: ${res.body}`.slice(0, 300)]);
            if (c.step === 41) await query(`UPDATE outreach_contacts SET status = 'bounced', updated_at = NOW() WHERE token = $1`, [c.token]);
        }
        return 'failed';
    }
    await query(`INSERT INTO outreach_sends (token, step, template, domain, from_addr, message_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (token, step) DO NOTHING`, [c.token, c.step, `CX_A_${c.step - CX_STEP0}`, domain, from, res.id ?? null]);
    return 'sent';
}

// ---------- test sends (authorized addresses only) ----------

export async function sendCxTest(o: { domain: string; to: string; email?: string; steps?: number[] }): Promise<{ sent: number; detail: string[] }> {
    await ensureCxTables();
    const to = o.to.trim().toLowerCase();
    if (!CX_TEST_ALLOW.has(to)) throw new Error('test address is not on the authorized list');
    const s = await getSettings();
    const verified = await resendDomains(true);
    const dom = o.domain.toLowerCase();
    if (verified[dom] !== 'verified') throw new Error(`${dom} is not verified in Resend yet`);
    let seed = (await query(`SELECT token FROM outreach_contacts WHERE email = $1`, [to])).rows[0]?.token as string | undefined;
    if (!seed) {
        seed = randomBytes(8).toString('base64url').slice(0, 10);
        await query(`INSERT INTO outreach_contacts (token, email, first_name, segment, template, wave, status) VALUES ($1,$2,'Eric','seed','CXT','seed','pending')`, [seed, to]);
    }
    let drafts;
    if (o.email) {
        const r = (await query(`SELECT d.step, d.subject, d.body FROM cx_draft d JOIN outreach_contacts c ON c.token = d.token WHERE c.email = $1 ORDER BY d.step`, [o.email.toLowerCase()])).rows;
        if (!r.length) throw new Error('no drafts for that contact');
        drafts = r.map((x) => ({ step: Number(x.step), subject: String(x.subject), body: String(x.body) }));
    } else {
        const p = buildProfile({ email: 'sample@example.com', first_name: 'Christopher', job_title: 'Managing Partner', company_name: 'Elliott Wealth Management Services, Llc', company_domain: 'elliottwealth.com', keywords: 'podcast;retirement income planning', email_status: 'good' });
        drafts = buildDrafts(p, seed);
    }
    const base = await linkBaseFor(dom, s); const detail: string[] = []; let sent = 0;
    for (const d of drafts.filter((x) => !o.steps || o.steps.includes(x.step))) {
        const m = renderCx(d, { token: seed, linkBase: base, unsubUrl: `${base}/u/${seed}`, mailingAddress: MAILING_ADDRESS });
        const r = await sendMail({ transport: 'resend', from: `${s.cx_from_display || 'Eric Huang'} <eric@${dom}>`, to, replyTo: s.cx_reply_to || s.reply_to || undefined, subject: m.subject, text: m.text,
            headers: { 'List-Unsubscribe': `<${base}/u/${seed}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }, token: seed, step: 9, campaign: 'cx_test', idempotencyKey: `cxt-${seed}-${dom}-${d.step}-${Date.now()}` });
        detail.push(`E${d.step}: ${r.ok ? 'accepted' : `failed ${r.status}`}`); if (r.ok) sent++;
        await new Promise((x) => setTimeout(x, 1200));
    }
    return { sent, detail };
}

// ---------- admin status ----------

export async function cxStatus(): Promise<Record<string, unknown>> {
    await ensureCxTables();
    const s = await getSettings();
    const et = etParts(new Date());
    const [contacts, held, today, batches, steps, hooks] = await Promise.all([
        query(`SELECT c.status, COUNT(*)::int AS n FROM outreach_contacts c WHERE c.wave = 'cx' GROUP BY c.status ORDER BY c.status`),
        query(`SELECT COUNT(*)::int AS n FROM cx_profile WHERE hold`),
        query(`SELECT step, COUNT(*)::int AS n FROM outreach_sends WHERE step BETWEEN 41 AND 44 AND (sent_at AT TIME ZONE 'America/New_York')::date = $1::date GROUP BY step ORDER BY step`, [et.date]),
        query(`SELECT id, name, created_at, total, imported FROM cx_batches ORDER BY id DESC LIMIT 5`),
        query(`SELECT step, COUNT(*)::int AS sent, COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered, COUNT(*) FILTER (WHERE status = 'bounced')::int AS bounced, COUNT(*) FILTER (WHERE complaint)::int AS complaints FROM outreach_sends WHERE step BETWEEN 41 AND 44 GROUP BY step ORDER BY step`),
        query(`SELECT hook_id, COUNT(*)::int AS n FROM cx_profile GROUP BY hook_id ORDER BY n DESC`),
    ]);
    const cfg: Record<string, string> = {};
    for (const [k] of CX_DEFAULTS) cfg[k] = s[k] ?? '';
    return { settings: cfg, contacts: contacts.rows, held: held.rows[0].n, today: today.rows, batches: batches.rows, steps: steps.rows, hooks: hooks.rows, domains: await domainStates(s, et.date), now_et: `${et.date} ${String(et.hour).padStart(2, '0')}:${String(et.minute).padStart(2, '0')}`, resend_key: !!process.env.RESEND_API_KEY };
}
