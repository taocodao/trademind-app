/**
 * Invitation copy (v7 text): sample first, risk first. Branded HTML plus plain text. Applies only while outreach_settings.copy_v6_start is set,
 * and never to the control group (1 in 5 contacts keep the earlier copy, picked by a hash of the token).
 * Spintax choices are seeded by token and step, so a retry or a re-render gives the identical email.
 */
import { createHash } from 'crypto';
import { COPY_V6 } from './copy-v6.data';
import { INVITE_TEMPLATES_V5 } from './templates-v5';

const FIRST_STEP_KEY = 'FIRST';
const STAGE_KEY: Record<number, string> = { 1: FIRST_STEP_KEY, 2: 'FU1', 5: 'FU2', 6: 'FU3', 7: 'FINAL' };
/** Follow-up stage 2 sends the reader straight to a published issue for these templates. */
export const V6_PREVIEW_VARIANT: Record<string, 'ml' | 'bt'> = { T1: 'ml', T2: 'ml', T3: 'ml', T4: 'ml', T5: 'ml', T6: 'ml' };

/** The old-copy comparison group (1 in 5) was switched off on Oct 18 2026: every contact gets the current copy. */
export function isV6Control(token: string): boolean {
    if (token) return false;
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
    const anchor = (u: string, label: string) => `<a href="${escH(u)}" class="pl" style="color:#8fb3ff;">${escH(label)}</a>`;
    const bigBtn = (u: string, label: string, caption: string) =>
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;"><tr><td style="border-radius:8px;background:#2f6bff;"><a href="${escH(u)}" style="display:inline-block;padding:14px 32px;${FONT}font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escH(label)}</a></td></tr></table>`
        + `<p class="t2" style="margin:0 0 20px;font-size:12px;color:#aab4c5;">${escH(caption)}</p>`;
    const outlineBtn = (u: string) =>
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;"><tr><td style="border-radius:8px;border:2px solid #2f6bff;"><a href="${escH(u)}" style="display:inline-block;padding:11px 24px;${FONT}font-size:15px;font-weight:600;color:#8fb3ff;text-decoration:none;border-radius:8px;">Subscribe free</a></td></tr></table>`;
    const textLink = (u: string, label: string) => `<p style="margin:0 0 18px;${FONT}font-size:15px;"><a href="${escH(u)}" class="pl" style="color:#8fb3ff;">${escH(label)}</a></p>`;
    const strip = () => {
        const items: [string, string, string][] = [['weather', 'Market weather', 'regime read'], ['readout', 'Copilot readout', 'ML in plain English'], ['flight', 'Flight plan', 'one strategy idea'], ['turbulence', 'Turbulence test', 'what could go wrong']];
        const tds = items.map(([k, n, d]) => `<td width="25%" valign="top" style="padding:12px 6px;${FONT}font-size:12px;line-height:1.4;"><a href="${escH(`${o.baseUrl}/r/${o.token}/i?s=${o.step}&a=${k}`)}" class="pl" style="display:block;color:#8fb3ff;font-size:13px;font-weight:700;text-decoration:none;">${n} &rsaquo;</a><span class="t2" style="color:#aab4c5;">${d}</span></td>`).join('');
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;border-top:1px solid #273449;border-bottom:1px solid #273449;"><tr>${tds}</tr></table><p class="t2" style="margin:0 0 18px;font-size:12px;color:#aab4c5;">Tap any part to see what it covers.</p>`;
    };
    const out: string[] = [];
    const blocks = main.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    blocks.forEach((block, bi) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (bi === blocks.length - 1 && lines.length === 1 && /^(Best, Eric|Thanks, Eric|Eric)$/.test(lines[0])) {
            out.push(`<p class="t" style="margin:0 0 4px;font-size:16px;color:#e5e7eb;">Eric Huang</p><p class="t2" style="margin:0 0 24px;font-size:13px;color:#aab4c5;">Founder, TradeMind &middot; New York</p>`);
            return;
        }
        let plain: string[] = [];
        const flush = () => { if (plain.length) { out.push(`<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;">${plain.map(escH).join('<br>')}</p>`); plain = []; } };
        for (const l of lines) {
            const m = l.match(/^(Preview an issue|Read another sample|Subscribe free|Or subscribe free|See a sample issue first|What each issue covers): (https:\/\/\S+)$/);
            if (!m) { plain.push(l); continue; }
            flush();
            const [, label, url] = m;
            if (label === 'Preview an issue') out.push(bigBtn(url, 'Preview', 'See a real issue first. No sign-up needed.'));
            else if (label === 'Read another sample') out.push(bigBtn(url, 'Read another sample', 'A different issue. No sign-up needed.'));
            else if (label === 'Subscribe free') out.push(bigBtn(url, 'Subscribe free', 'Free weekly brief. Unsubscribe any time.'));
            else if (label === 'Or subscribe free') out.push(outlineBtn(url));
            else if (label === 'See a sample issue first') out.push(textLink(url, label));
            else out.push(strip());
        }
        flush();
    });
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
        sim_link: `${o.baseUrl}/r/${o.token}/v?s=${o.step}`,
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
