/**
 * Invitation copy v6: short plain-text notes with spintax. Applies only while outreach_settings.copy_v6_start is set,
 * and never to the control group (1 in 5 contacts keep the earlier copy, picked by a hash of the token).
 * Spintax choices are seeded by token and step, so a retry or a re-render gives the identical email.
 */
import { createHash } from 'crypto';
import { COPY_V6 } from './copy-v6.data';
import { INVITE_TEMPLATES_V5 } from './templates-v5';

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
    origSubject?: string; useHtml?: boolean; baseUrl: string; mailingAddress: string; sigSep: string;
}

function escH(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

/** HTML version in the existing branded layout (header, button, footer). Same words and links as the plain text. */
function v6Html(main: string, o: V6Opts, subject: string, unsubUrl: string): string {
    const shell = INVITE_TEMPLATES_V5.FU.html as string;
    const startMarker = '<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;">Hi ';
    const a = shell.indexOf(startMarker);
    const z = shell.indexOf('</td></tr>\n<tr><td class="px t2"');
    if (a < 0 || z < 0) throw new Error('v6 html shell markers not found');
    const homeUrl = `${o.baseUrl}/r/${o.token}/h?s=${o.step}`;
    const preheader = main.replace(/\s+/g, ' ').trim().slice(0, 90);
    let head = shell.slice(0, a)
        .replace(/(<div style="display:none;max-height:0;overflow:hidden;opacity:0;">)[^<]*(&#847;)/, `$1${escH(preheader)}$2`)
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escH(subject)}</title>`)
        .replace(/href="https:\/\/trademind\.bot"/g, `href="${homeUrl}"`);
    let tail = shell.slice(z).replace(
        /You(?:’|&rsquo;|')re receiving this invitation because[\s\S]*?Unsubscribe in one click<\/a>\./,
        `You’re getting this invite because you subscribed to an investing publication. <a href="${unsubUrl}" class="t" style="color:#aab4c5;text-decoration:underline;">Unsubscribe or snooze</a>.`
    );
    const nice = (u: string) => (/\/s\?/.test(u) ? 'sign up free' : /\/p\?/.test(u) ? 'read the issue' : /\/i\?/.test(u) ? 'see what is inside' : u);
    const anchor = (u: string, label: string) => `<a href="${escH(u)}" class="pl" style="color:#8fb3ff;">${escH(label)}</a>`;
    const prose = (l: string) => escH(l).replace(/https:\/\/[^\s<]+?(?=[.,]?(?:\s|$|<))/g, (u) => { const raw = u.replace(/&amp;/g, '&'); return anchor(raw, nice(raw)); });
    const out: string[] = [];
    for (const block of main.split(/\n\s*\n/)) {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) continue;
        const parts: string[] = [];
        let plain: string[] = [];
        const flush = () => { if (plain.length) { parts.push(`<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;">${plain.join('<br>')}</p>`); plain = []; } };
        const linkLines: string[] = [];
        const flushLinks = () => { if (linkLines.length) { parts.push(`<p class="t" style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#e5e7eb;">${linkLines.join('<br>')}</p>`); linkLines.length = 0; } };
        for (const l of lines) {
            const sub = l.match(/^Or subscribe free: (https:\/\/\S+)$/);
            const lab = l.match(/^(Preview an issue|What each issue covers): (https:\/\/\S+)$/);
            if (sub) {
                flush(); flushLinks();
                parts.push(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;"><tr><td style="border-radius:8px;background:#2f6bff;"><a href="${escH(sub[1])}" style="display:inline-block;padding:13px 26px;${FONT}font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Subscribe free</a></td></tr></table>`);
            } else if (lab) {
                flush(); linkLines.push(anchor(lab[2], lab[1]));
            } else { flushLinks(); plain.push(prose(l)); }
        }
        flush(); flushLinks();
        out.push(...parts);
    }
    return (head + out.join('\n') + tail).replace(/\{\{mailing_address\}\}/g, escH(o.mailingAddress));
}

export function renderV6(o: V6Opts): { subject: string; text: string; html: string | null; unsubUrl: string } {
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
        inside_link: `${o.baseUrl}/r/${o.token}/i?s=${o.step}`,
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
    const main = body.split(`\n${o.sigSep}\n`)[0].trim();
    // Closing line stays "Best, Eric"; the layout adds the founder line below it.
    const html = o.useHtml ? v6Html(main + '\n', o, subject, vals.unsubscribe_link) : null;
    return { subject, text: body, html, unsubUrl: vals.unsubscribe_link };
}
