/**
 * Invitation copy v6: short plain-text notes with spintax. Applies only while outreach_settings.copy_v6_start is set,
 * and never to the control group (1 in 5 contacts keep the earlier copy, picked by a hash of the token).
 * Spintax choices are seeded by token and step, so a retry or a re-render gives the identical email.
 */
import { createHash } from 'crypto';
import { COPY_V6 } from './copy-v6.data';

const FIRST_STEP_KEY = 'FIRST';
const STAGE_KEY: Record<number, string> = { 1: FIRST_STEP_KEY, 2: 'FU1', 5: 'FU2', 6: 'FU3', 7: 'FINAL' };
/** Follow-up stage 2 sends the reader straight to a published issue for these templates. */
export const V6_PREVIEW_VARIANT: Record<string, 'ml' | 'bt'> = { T2: 'bt', T6: 'ml' };

/** One contact in five stays on the earlier copy so the two versions can be compared. */
export function isV6Control(token: string): boolean {
    return parseInt(createHash('sha256').update(`${token}:copy-v6`).digest('hex').slice(0, 8), 16) % 5 === 0;
}

export function hasV6(template: string, step: number, branch: 'C' | 'N'): boolean {
    const st = STAGE_KEY[step];
    if (!st) return false;
    return !!COPY_V6[`${template}_${st === FIRST_STEP_KEY ? 'A' : branch}_${st}`];
}

function rng(seed: string): () => number {
    let n = 0;
    return () => {
        const h = createHash('sha256').update(`${seed}:${n++}`).digest();
        return h.readUInt32BE(0) / 0x100000000;
    };
}

/** Replace each {a|b|c} group with one option. Groups need a pipe; a trailing empty option is allowed. */
export function spin(src: string, seed: string): string {
    const r = rng(seed);
    return src.replace(/\{([^{}]*\|[^{}]*)\}/g, (_m, g: string) => {
        const opts = g.split('|');
        return opts[Math.floor(r() * opts.length)];
    });
}

export interface V6Opts {
    template: string; step: number; branch: 'C' | 'N'; token: string; firstName: string | null;
    origSubject?: string; baseUrl: string; mailingAddress: string; sigSep: string;
}

export function renderV6(o: V6Opts): { subject: string; text: string; html: null; unsubUrl: string } {
    const st = STAGE_KEY[o.step];
    const key = `${o.template}_${st === FIRST_STEP_KEY ? 'A' : o.branch}_${st}`;
    const t = COPY_V6[key];
    if (!t) throw new Error(`Unknown copy v6 ${key}`);
    const seed = `${o.token}:${o.step}`;
    const first = (o.firstName ?? '').trim();
    const variant = o.step === 5 ? V6_PREVIEW_VARIANT[o.template] : undefined;
    const vals: Record<string, string> = {
        first_name: first,
        preview_link: `${o.baseUrl}/r/${o.token}/p?s=${o.step}${variant ? `&v=${variant}` : ''}`,
        subscribe_link: `${o.baseUrl}/r/${o.token}/s?s=${o.step}`,
        unsubscribe_link: `${o.baseUrl}/u/${o.token}`,
        mailing_address: o.mailingAddress,
        original_subject: o.origSubject ?? '',
        sig_sep: o.sigSep,
    };
    const fillAll = (s: string) => s.replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (_m, a: string, b: string) => vals[a ?? b] ?? '');
    let subject = fillAll(spin(t.subject, `${seed}:s`)).trim();
    let body = spin(t.body, `${seed}:b`);
    if (!first) {
        // No name on file: drop the name rather than write "there".
        body = body.replace(/^(?:(Hi|Hey|Hello) )?\s*\{first_name\},[ \t]*/, (_m, g: string | undefined) => (g ? `${g},` : ''));
        body = body.replace(/^\n+/, '');
        if (/^[a-z]/.test(body)) body = body.charAt(0).toUpperCase() + body.slice(1);
    }
    body = fillAll(body).replace(/^[ \t]+/, '').replace(/[ \t]+,/g, ',');
    if (!subject) subject = 'quick question';
    return { subject, text: body, html: null, unsubUrl: vals.unsubscribe_link };
}
