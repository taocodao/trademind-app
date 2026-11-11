/**
 * Per recipient rendering and the send outbox for the weekly and daily editions.
 * Private signal blocks are built here from the locked facts record, at send time, for one account per email.
 */
import { query } from '@/lib/db';
import { ensureNewsletterTables, makeLongUnsubscribeToken } from '../db';
import { MAILING_ADDRESS } from '../email';
import { makeDailyLinkToken } from '../daily-link';
import { renderNewsletter, FAILED_RUN, type AccountBlock, type EditionInput } from '../edition-render';
import type { FactsRun, StrategyFacts } from '@/lib/briefing/types';
import { renderLinkEmail } from '../link-email';
import { ensureEditionTables } from './db';
import { toInput, type PublicPayload } from './build';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.NEWSLETTER_FROM ?? 'The AI Systematic Investor by TradeMind <newsletter@news.trademind.bot>';
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO ?? 'support@trademind.bot';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
const NAME: Record<string, 'QQQ Defensive' | 'QQQ LEAPS'> = { TQQQ_TURBOCORE_PRO: 'QQQ Defensive', QQQ_LEAPS: 'QQQ LEAPS' };

export interface Recipient { subscriberId: number; email: string; accountId: number; account: { name: string; strategy: string; riskLevel: string | null } | null }

const SUPPRESSED = `NOT EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = s.email)`;

/** One row per subscriber for weekly; one row per active account (or one account-less row) for daily. */
export async function pendingRecipients(editionId: number, kind: 'weekly' | 'daily', limit: number, onlyEmail?: string): Promise<Recipient[]> {
    await ensureNewsletterTables(); await ensureEditionTables();
    const cad = kind === 'weekly' ? `('weekly','both')` : `('daily','both')`;
    const subs = await query(
        `SELECT s.id, s.email FROM newsletter_subscribers s
          WHERE s.status = 'confirmed' AND s.cadence IN ${cad} AND ${SUPPRESSED}
            ${onlyEmail ? 'AND lower(s.email) = lower($3)' : ''}
            AND NOT EXISTS (SELECT 1 FROM newsletter_edition_sends d WHERE d.edition_id = $1 AND d.subscriber_id = s.id AND d.status IN ('sent','sending'))
          ORDER BY s.id LIMIT $2`, onlyEmail ? [editionId, limit, onlyEmail] : [editionId, limit]);
    const out: Recipient[] = [];
    for (const s of subs.rows) {
        if (kind === 'weekly') { out.push({ subscriberId: s.id, email: s.email, accountId: 0, account: null }); continue; }
        const accts = await query(
            `SELECT a.id, a.name, a.strategy, a.risk_level FROM accounts a JOIN account_memberships m ON m.account_id = a.id
               LEFT JOIN user_settings us ON us.user_id = a.user_id LEFT JOIN users u ON u.privy_did = a.user_id
              WHERE m.status IN ('free_month','active') AND lower(coalesce(us.login_email, u.email)) = lower($1) ORDER BY a.id`, [s.email]);
        const sent = await query(`SELECT account_id FROM newsletter_edition_sends WHERE edition_id = $1 AND subscriber_id = $2 AND status IN ('sent','sending')`, [editionId, s.id]);
        const done = new Set(sent.rows.map((r: any) => Number(r.account_id)));
        if (!accts.rows.length) { if (!done.has(0)) out.push({ subscriberId: s.id, email: s.email, accountId: 0, account: null }); continue; }
        for (const a of accts.rows) if (!done.has(Number(a.id))) out.push({ subscriberId: s.id, email: s.email, accountId: Number(a.id), account: { name: String(a.name), strategy: String(a.strategy), riskLevel: a.risk_level ? String(a.risk_level).toLowerCase() : null } });
    }
    return out;
}

const fmt = (items: { symbol: string; pct: number }[]) => items.map((i) => `${i.symbol} ${i.pct}%`).join(', ');

/** Builds the private account block from the locked facts. Pure, so it can be tested. */
export function accountBlock(facts: FactsRun, a: NonNullable<Recipient['account']>): AccountBlock | null {
    const name = NAME[a.strategy]; if (!name) return null;
    const s: StrategyFacts | undefined = facts.strategies.find((x) => x.strategy === a.strategy);
    const label = a.name;
    const bad = !s || !s.run_verified || s.status === 'RUN_FAILED' || s.status === 'DELAYED' || s.status === 'UNVERIFIED';
    if (bad) return { strategy: name, label, riskLevel: a.riskLevel ?? undefined, status: 'FAILED', lines: [] };
    if (name === 'QQQ LEAPS') {
        return s.status === 'CHANGE'
            ? { strategy: name, label, status: 'CHANGE', lines: s.instructions.length ? s.instructions : ['A new instruction was published. Open your account to see it.'] }
            : { strategy: name, label, status: 'NO_CHANGE', lines: ['Keep your current model position. The next review follows the LEAPS schedule.'] };
    }
    const w = s.weights.find((x) => x.level === a.riskLevel);
    if (!w) return { strategy: name, label, riskLevel: a.riskLevel ?? undefined, status: s.status === 'CHANGE' ? 'CHANGE' : 'NO_CHANGE', lines: ['Open your account to see your instruction for your risk level.'] };
    const before = s.previous_weights.find((x) => x.level === w.level);
    if (s.status === 'CHANGE' && before && JSON.stringify(before.items) !== JSON.stringify(w.items))
        return { strategy: name, label, riskLevel: w.level, status: 'CHANGE', lines: [`Move to ${fmt(w.items)}.`, `Before: ${fmt(before.items)}.`] };
    return { strategy: name, label, riskLevel: w.level, status: 'NO_CHANGE', lines: [`Keep your current model position: ${fmt(w.items)}.`] };
}

export async function renderFor(rcp: Recipient, kind: 'weekly' | 'daily', p: PublicPayload, date: string, _facts: FactsRun | null) {
    const unsub = `${BASE_URL}/newsletter/unsubscribe?token=${await makeLongUnsubscribeToken(rcp.subscriberId)}`;
    const tok = makeDailyLinkToken(rcp.subscriberId);
    // Subscriber emails carry only a link to the edition on the website. The edition itself is rendered on the site.
    const subject = renderNewsletter(toInput(p, date, {})).subject;
    const daily = kind === 'daily';
    const m = renderLinkEmail({
        subject, description: daily ? 'The daily TradeMind brief is on the site: one short idea and one risk for the market day.' : 'This week\u2019s TradeMind brief is on the site: market weather, a flight plan idea and a turbulence test, risk first. About five minutes.',
        url: `${BASE_URL}${daily ? '/newsletter/daily' : '/newsletter/current'}`,
        unsubscribeUrl: unsub, preferencesUrl: `${BASE_URL}/newsletter/preferences?k=${encodeURIComponent(tok)}`, address: `TradeMind, ${MAILING_ADDRESS}`,
    });
    return { ...m, unsub };
}

export async function sendRendered(editionId: number, rcp: Recipient, m: { subject: string; html: string; text: string; unsub: string }, toOverride?: string): Promise<{ ok: boolean; error?: string }> {
    if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY missing' };
    const ledger = !toOverride;
    if (ledger) {
        const ins = await query(`INSERT INTO newsletter_edition_sends (edition_id, subscriber_id, account_id, status) VALUES ($1,$2,$3,'sending')
            ON CONFLICT (edition_id, subscriber_id, account_id) DO UPDATE SET status = 'sending' WHERE newsletter_edition_sends.status = 'failed' RETURNING 1`, [editionId, rcp.subscriberId, rcp.accountId]);
        if (!ins.rowCount) return { ok: false, error: 'already sent or in progress' };
    }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to: toOverride ?? rcp.email, subject: (toOverride ? '[Sample] ' : '') + m.subject, text: m.text,
                headers: { 'List-Unsubscribe': `<${m.unsub.replace('/newsletter/unsubscribe?', '/api/newsletter/unsubscribe?')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }),
        });
        const body = await res.json().catch(() => ({}));
        if (ledger) await query(`UPDATE newsletter_edition_sends SET status = $4, resend_id = $5, error = $6 WHERE edition_id = $1 AND subscriber_id = $2 AND account_id = $3`,
            [editionId, rcp.subscriberId, rcp.accountId, res.ok ? 'sent' : 'failed', body?.id ?? null, res.ok ? null : JSON.stringify(body).slice(0, 500)]);
        return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    } catch (e) {
        if (ledger) await query(`UPDATE newsletter_edition_sends SET status = 'failed', error = $4 WHERE edition_id = $1 AND subscriber_id = $2 AND account_id = $3`, [editionId, rcp.subscriberId, rcp.accountId, String((e as Error).message).slice(0, 300)]);
        return { ok: false, error: 'network' };
    }
}
