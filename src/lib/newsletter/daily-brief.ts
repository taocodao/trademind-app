/**
 * Free daily brief: builds the day's facts from the locked briefing record, finds recipients (confirmed subscribers who
 * chose the daily cadence) and their strategy account, and sends one email each. Sending is off unless
 * DAILY_BRIEF_SEND_ENABLED=1, and each subscriber gets at most one brief per day (ledger table).
 */
import { query } from '@/lib/db';
import { ensureNewsletterTables, makeLongUnsubscribeToken } from './db';
import { MAILING_ADDRESS } from './email';
import { makeDailyLinkToken } from './daily-link';
import { buildFacts, lockFacts } from '@/lib/briefing/facts';
import { longDate } from '@/lib/briefing/calendar';
import type { FactsRun } from '@/lib/briefing/types';
import { FLIGHT_PLAN_MODULES, RISK_MODULES } from '@/lib/emailgen/modules';
import { renderDaily, FAILED_RUN, type DailyFacts, type DailyAccount } from '@/lib/outreach/copy-daily';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.NEWSLETTER_FROM ?? 'The AI Systematic Investor by TradeMind <newsletter@news.trademind.bot>';
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO ?? 'support@trademind.bot';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
const STRATEGY_NAME: Record<string, string> = { TQQQ_TURBOCORE_PRO: 'QQQ Defensive', QQQ_LEAPS: 'QQQ LEAPS' };

export function dailyFactsFrom(f: FactsRun, date: string): DailyFacts {
    const def = f.strategies.find((s) => s.strategy === 'TQQQ_TURBOCORE_PRO');
    const bad = (st: string) => st === 'RUN_FAILED' || st === 'DELAYED' || st === 'UNVERIFIED';
    // The Defensive run decides the whole issue. A failed LEAPS check only changes the LEAPS line.
    const failed = !def || bad(def.status) || !def.run_verified;
    const status: DailyFacts['status'] = failed ? 'FAILED' : f.strategies.some((s) => s.status === 'CHANGE') ? 'CHANGE' : 'NO_CHANGE';
    const strategyStatus: Record<string, string> = {};
    for (const s of f.strategies) {
        strategyStatus[s.display_name] = s.status === 'NO_CHANGE' ? 'No change to the published instruction today.'
            : s.status === 'CHANGE' ? 'A new instruction was published today. Open your account to see it.' : FAILED_RUN;
    }
    const keys = Object.keys(FLIGHT_PLAN_MODULES); const rkeys = Object.keys(RISK_MODULES);
    const day = Math.floor(new Date(`${date}T12:00:00Z`).getTime() / 864e5);
    const idea = FLIGHT_PLAN_MODULES[keys[day % keys.length]]; const risk = RISK_MODULES[rkeys[day % rkeys.length]];
    return {
        dateLabel: new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        runLabel: `the ${longDate(date).replace(/, \d{4}$/, '')} 3:00 PM ET model run`,
        regime: def?.regime ?? 'not available', trend: null, trendChanged: null, status, strategyStatus,
        ideaTitle: idea.title, idea: idea.body, ideaWhy: 'Knowing the cost of a rule in advance makes it easier to keep following it.',
        risk: risk.body, sample: false,
    };
}

export async function buildDailyFacts(date: string, locked: boolean): Promise<{ facts: DailyFacts; hash: string }> {
    const run = locked ? await lockFacts(date) : await buildFacts(date);
    return { facts: dailyFactsFrom(run, date), hash: run.hash };
}

export interface DailyRecipient { id: number; email: string; firstName: string | null; account: (DailyAccount & { id: number }) | null }

/** Confirmed daily readers, not suppressed, with their first active strategy account when the login email matches. */
export async function dailyRecipients(opts: { limit: number; date: string; onlyEmail?: string }): Promise<DailyRecipient[]> {
    await ensureNewsletterTables(); await ensureDailySends();
    const r = await query(
        `SELECT s.id, s.email,
                (SELECT a.id FROM accounts a JOIN account_memberships m ON m.account_id = a.id
                   LEFT JOIN user_settings us ON us.user_id = a.user_id LEFT JOIN users u ON u.privy_did = a.user_id
                  WHERE m.status IN ('free_month','active') AND lower(coalesce(us.login_email, u.email)) IN (lower(s.email), lower(coalesce(s.canonical_email, s.email)))
                  ORDER BY a.id LIMIT 1) AS account_id
           FROM newsletter_subscribers s
          WHERE s.status = 'confirmed' AND s.cadence IN ('daily','both')
            AND NOT EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = s.email)
            AND NOT EXISTS (SELECT 1 FROM newsletter_daily_sends d WHERE d.run_date = $1::date AND d.subscriber_id = s.id AND d.status IN ('sent','sending'))
            ${opts.onlyEmail ? 'AND lower(s.email) = lower($3)' : ''}
          ORDER BY s.id LIMIT $2`,
        opts.onlyEmail ? [opts.date, opts.limit, opts.onlyEmail] : [opts.date, opts.limit]);
    const out: DailyRecipient[] = [];
    for (const row of r.rows) {
        let account: DailyRecipient['account'] = null;
        if (row.account_id) {
            const a = await query(`SELECT id, name, strategy FROM accounts WHERE id = $1`, [row.account_id]);
            if (a.rows[0]) account = { id: a.rows[0].id, label: String(a.rows[0].name), strategy: STRATEGY_NAME[a.rows[0].strategy] ?? 'QQQ strategy' };
        }
        out.push({ id: row.id, email: row.email, firstName: null, account });
    }
    return out;
}

let ready = false;
export async function ensureDailySends(): Promise<void> {
    if (ready) return;
    await query(`CREATE TABLE IF NOT EXISTS newsletter_daily_sends (
        run_date DATE NOT NULL, subscriber_id BIGINT NOT NULL, status TEXT NOT NULL, resend_id TEXT, error TEXT,
        facts_hash TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (run_date, subscriber_id))`);
    ready = true;
}

export async function renderForRecipient(rcp: DailyRecipient, facts: DailyFacts, date: string) {
    const unsub = rcp.id ? `${BASE_URL}/newsletter/unsubscribe?token=${await makeLongUnsubscribeToken(rcp.id)}` : `${BASE_URL}/newsletter/unsubscribe`;
    const r = renderDaily({
        linkToken: makeDailyLinkToken(rcp.id), firstName: rcp.firstName, baseUrl: BASE_URL, mailingAddress: MAILING_ADDRESS,
        unsubscribeUrl: unsub, accountId: rcp.account?.id ?? null, editionDate: date, facts, account: rcp.account,
    });
    return { ...r, unsub };
}

export async function sendOne(rcp: DailyRecipient, facts: DailyFacts, date: string, hash: string, toOverride?: string): Promise<{ ok: boolean; error?: string }> {
    if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY missing' };
    const m = await renderForRecipient(rcp, facts, date);
    const ledger = !toOverride;
    if (ledger) {
        const ins = await query(`INSERT INTO newsletter_daily_sends (run_date, subscriber_id, status, facts_hash) VALUES ($1::date,$2,'sending',$3)
            ON CONFLICT (run_date, subscriber_id) DO UPDATE SET status = 'sending' WHERE newsletter_daily_sends.status = 'failed' RETURNING 1`, [date, rcp.id, hash]);
        if (!ins.rowCount) return { ok: false, error: 'already sent or in progress' };
    }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: FROM, reply_to: REPLY_TO, to: toOverride ?? rcp.email, subject: (toOverride ? '[Sample] ' : '') + m.subject, html: m.html, text: m.text,
                headers: { 'List-Unsubscribe': `<${m.unsub.replace('/newsletter/unsubscribe?', '/api/newsletter/unsubscribe?')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
            }),
        });
        const body = await res.json().catch(() => ({}));
        if (ledger) await query(`UPDATE newsletter_daily_sends SET status = $3, resend_id = $4, error = $5 WHERE run_date = $1::date AND subscriber_id = $2`,
            [date, rcp.id, res.ok ? 'sent' : 'failed', body?.id ?? null, res.ok ? null : JSON.stringify(body).slice(0, 500)]);
        return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    } catch (e) {
        if (ledger) await query(`UPDATE newsletter_daily_sends SET status = 'failed', error = $3 WHERE run_date = $1::date AND subscriber_id = $2`, [date, rcp.id, String((e as Error).message).slice(0, 300)]);
        return { ok: false, error: 'network' };
    }
}
