import rules from '@/data/banned-phrases.json';
import pool from '@/lib/db';
import { contentHash, stable } from '@/lib/briefing/approval';
import { etDate, etMinutes, schedule } from '@/lib/briefing/calendar';
import { FLIGHT_PLAN_MODULES, RISK_MODULES } from '@/lib/emailgen/modules';
import { ISSUES, FIRST_PUBLISHED_NUMBER } from '../issues';

const TEMPLATES = ISSUES.filter((i) => i.number < FIRST_PUBLISHED_NUMBER);
import { renderNewsletter, type EditionInput } from '../edition-render';
import { searchSources, writeFromSources } from './sources';
import { ensureEditionTables } from './db';

export interface PublicPayload {
    kind: 'weekly' | 'daily';
    dateLabel: string; hook: string; preheader: string;
    context: EditionInput['context']; weekAhead: string[];
    idea: EditionInput['idea']; risk: string; lessonNumber: number | null; note?: string;
    /** Old library issue used as the body of this edition, and a short sourced line tying the week to it. */
    templateNumber?: number; tieIn?: string;
}
export interface Check { name: string; pass: boolean; detail?: string }

const longLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const QUERIES = {
    weekly: ['Nasdaq-100 QQQ week in review', 'week ahead stocks earnings Federal Reserve economic data', 'Federal Reserve rates inflation outlook this week'],
    daily: ['Nasdaq-100 QQQ stock market today', 'stock market news today earnings Federal Reserve'],
};

/** Both strategy runs are in, or the late deadline has passed. A late deadline marks the missing run as unconfirmed. */
export async function dailyReadiness(date: string): Promise<{ defensive: boolean; leaps: boolean; ready: boolean; late: boolean }> {
    const d = await pool.query(`SELECT 1 FROM signals WHERE strategy = 'TQQQ_TURBOCORE_PRO' AND ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York')::date = $1::date LIMIT 1`, [date]);
    const l = await pool.query(`SELECT 1 FROM engine_heartbeat WHERE strategy = 'QQQ_LEAPS' AND run_date = $1::date`, [date]);
    const late = etMinutes() >= schedule(date).fallback;
    const defensive = !!d.rows[0], leaps = !!l.rows[0];
    return { defensive, leaps, late, ready: (defensive && leaps) || (late && defensive) };
}

export function checkEdition(subject: string, text: string, html: string, problems: string[], p: PublicPayload): Check[] {
    const all = `${subject}\n${text}`; const low = all.toLowerCase(); const vis = all.replace(/https?:\/\/\S+/g, '');
    const hits: string[] = [];
    for (const ph of rules.phrases) if (low.includes(ph)) hits.push(ph);
    for (const pt of rules.patterns) if (new RegExp(pt.regex, 'i').test(all)) hits.push(pt.name);
    const extra = /\b(confidence|protect capital|compound quietly|exposure tier|\btier\b|probability of profit)\b/i.exec(vis);
    return [
        { name: 'writer_rules', pass: problems.length === 0, detail: problems.join('; ') || undefined },
        { name: 'banned_phrases', pass: hits.length === 0 && !extra, detail: [...hits, extra?.[0]].filter(Boolean).join(', ') || undefined },
        { name: 'no_dashes', pass: !/[\u2013\u2014]|--/.test(vis) },
        { name: 'no_exclamation', pass: !/!/.test(vis) },
        { name: 'no_todo', pass: !/TODO/.test(all) },
        { name: 'retired_figures', pass: !/55\.1|14\.5%/.test(all) },
        { name: 'sources_linked', pass: p.context.length >= 2 && p.context.every((c) => /^https?:\/\//.test(c.sourceUrl)) },
        { name: 'unsubscribe', pass: /unsubscribe/i.test(html) },
    ];
}

/** Sample recipient used only to render the review copy. */
export const REVIEW_INPUT = { firstName: null, baseUrl: 'https://trademind.bot', linkToken: 'REVIEW', unsubscribeUrl: 'https://trademind.bot/newsletter/unsubscribe', preferencesUrl: 'https://trademind.bot/newsletter/preferences', mailingAddress: 'TradeMind, 151-58 24th Rd, Whitestone, NY 11357, United States' };

export function toInput(p: PublicPayload, date: string, extra: Partial<EditionInput>): EditionInput {
    return {
        kind: p.kind === 'weekly' ? 'weekly' : 'daily_free', sample: false, dateLabel: p.dateLabel, hook: p.hook, preheader: p.preheader,
        context: p.context, weekAhead: p.weekAhead, note: p.note, idea: p.idea, risk: p.risk,
        lesson: p.lessonNumber ? ISSUES.find((i) => i.number === p.lessonNumber) : undefined,
        editionDate: date, ...REVIEW_INPUT, ...extra,
    };
}

/** The templates are the library issues before the launch issue, used in order, one per week, then round again. */
export async function templateOrdinal(date: string): Promise<number> {
    const r = await pool.query(`SELECT count(*)::int AS n FROM newsletter_edition WHERE kind = 'weekly' AND edition_date >= '2026-11-15' AND edition_date < $1::date`, [date]);
    return r.rows[0]?.n ?? 0;
}

export type BuildResult = { stored: boolean; reason?: string; id?: number; status?: string; checks?: Check[] };

/** Builds and stores one draft. Idempotent per kind and date. Never sends. */
export async function buildEdition(kind: 'weekly' | 'daily', date = etDate(), factsHash: string | null = null): Promise<BuildResult> {
    await ensureEditionTables();
    const have = await pool.query(`SELECT id FROM newsletter_edition WHERE kind = $1 AND edition_date = $2::date`, [kind, date]);
    if (have.rows[0]) return { stored: false, reason: 'already built', id: have.rows[0].id };
    const dateLabel = longLabel(date);
    // Up to three writing attempts; the first draft with no rule problems wins, otherwise the last one is held.
    let hits = await searchSources(QUERIES[kind], { recency: kind === 'weekly' ? 'week' : 'day', maxResults: 8 });
    let written = await writeFromSources(hits, dateLabel, kind);
    for (let attempt = 1; attempt < 3 && (!written || written.problems.length); attempt++) {
        const h2 = await searchSources(QUERIES[kind], { recency: kind === 'weekly' ? 'week' : 'day', maxResults: 8 });
        const w2 = await writeFromSources(h2, dateLabel, kind);
        if (w2 && (!written || w2.problems.length < written.problems.length)) { written = w2; hits = h2; }
    }
    if (!written) return { stored: false, reason: hits.length ? 'writer unavailable' : 'no sources returned' };

    const n = Number((await pool.query(`SELECT count(*) FROM newsletter_edition WHERE kind = $1`, [kind])).rows[0].count);
    const day = Math.floor(new Date(`${date}T12:00:00Z`).getTime() / 864e5);
    const ik = Object.keys(FLIGHT_PLAN_MODULES), rk = Object.keys(RISK_MODULES);
    const idea = FLIGHT_PLAN_MODULES[ik[(kind === 'weekly' ? n : day) % ik.length]];
    const risk = RISK_MODULES[rk[(kind === 'weekly' ? n : day) % rk.length]];
    const tplIdx = kind === 'weekly' ? await templateOrdinal(date) : 0;
    const payload: PublicPayload = {
        kind, dateLabel, hook: written.hook, preheader: written.preheader, context: written.context, weekAhead: kind === 'weekly' ? written.weekAhead : [],
        idea: { title: idea.title, body: idea.body, why: 'Knowing the cost of a rule in advance makes it easier to keep following it.' }, risk: risk.body,
        lessonNumber: kind === 'weekly' ? ISSUES[n % ISSUES.length].number : null,
        ...(kind === 'weekly' ? { templateNumber: TEMPLATES[tplIdx % TEMPLATES.length].number, tieIn: written.tieIn } : {}),
    };
    const r = renderNewsletter(toInput(payload, date, {}));
    const checks = checkEdition(r.subject, r.text, r.html, written.problems, payload);
    const pass = checks.every((c) => c.pass);
    const status = pass ? 'draft' : 'held';
    const ins = await pool.query(
        `INSERT INTO newsletter_edition (kind, edition_date, status, subject, payload, sources, checks, facts_hash) VALUES ($1,$2::date,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (kind, edition_date) DO NOTHING RETURNING id`,
        [kind, date, status, r.subject, JSON.stringify(payload), JSON.stringify(hits.slice(0, 10).map((h) => ({ title: h.title, url: h.url, date: h.date }))), JSON.stringify(checks), factsHash]);
    const id = ins.rows[0]?.id;
    // Weekly editions publish by themselves when every check passes; one that fails a check is held and the owner is told.
    if (id && pass && kind === 'weekly') {
        await pool.query(`UPDATE newsletter_edition SET status = 'approved', approved_by = 'auto', approved_at = NOW(), approved_hash = $2 WHERE id = $1`, [id, contentHash(r.subject, stable(payload))]);
        return { stored: true, id, status: 'approved', checks };
    }
    return { stored: !!id, id, status, checks };
}

/** An edition may be sent only if approved, unchanged since approval, and (daily) built on the same facts record. */
export async function editionApproval(kind: 'weekly' | 'daily', date: string, factsHash: string | null): Promise<{ ok: boolean; reason?: string; edition?: any }> {
    await ensureEditionTables();
    const e = (await pool.query(`SELECT * FROM newsletter_edition WHERE kind = $1 AND edition_date = $2::date`, [kind, date])).rows[0];
    if (!e) return { ok: false, reason: 'no edition for this date' };
    if (e.status !== 'approved' && e.status !== 'sent') return { ok: false, reason: `edition is ${e.status}` };
    if (!e.approved_hash || contentHash(e.subject, stable(e.payload)) !== e.approved_hash) return { ok: false, reason: 'edition changed after approval' };
    if (kind === 'daily' && e.facts_hash !== factsHash) return { ok: false, reason: 'facts record changed after approval' };
    return { ok: true, edition: e };
}
