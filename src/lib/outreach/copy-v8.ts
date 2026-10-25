/**
 * First-touch invitation copy v8: the simulated back test result and its limitations sit in one block next to the
 * Subscribe free button, with the unsubscribe and offer lines directly under it. Two variants are tested 50/50 by a hash of the
 * token: A (Read the sample issue is the big button) and B (Subscribe free is the big button).
 * Applies only to first emails (step 1) sent after outreach_settings.copy_v8_start. Unset means off. Follow-ups are unchanged.
 * The variant is recomputable from the token, so no extra storage is needed for analysis.
 */
import { createHash } from 'crypto';
import { INVITE_TEMPLATES_V5 } from './templates-v5';

export type V8Variant = 'A' | 'B' | 'C';
/** Even hash gives A. Odd gives B, or C once cEnabled is set (copy_v8c_start): C replaces B for first emails sent after that time. */
export function v8Variant(token: string, cEnabled = false): V8Variant {
    const even = parseInt(createHash('sha256').update(`${token}:copy-v8`).digest('hex').slice(0, 8), 16) % 2 === 0;
    return even ? 'A' : cEnabled ? 'C' : 'B';
}

export const PARTS: [string, string, string][] = [
    ['weather', 'Market weather', 'current conditions'],
    ['readout', 'Copilot readout', 'what the model indicates'],
    ['flight', 'Flight plan', 'scenarios to watch'],
    ['turbulence', 'Turbulence test', 'what could invalidate the outlook'],
];
export const RESULT_H = 'Two-year simulated backtest, not actual trading';
export const RESULT_P1 = 'From October 14, 2024 through October 13, 2026, the QQQ LEAPS simulation, including its test-phase SMH put-spread sleeve, showed a total return of 229.48%. QQQ buy and hold returned 49.46% over the same period. That is about 4.6 times the percentage return, not 4.6 times the ending account value.';
export const RESULT_P2 = 'The largest simulated decline from a previous portfolio high was 14.59%, compared with 22.88% for QQQ buy and hold.';
export const LIMITS = 'These are hypothetical results, not returns earned in a real account. Options were model-priced, not valued using actual option quotes. The SMH sleeve has never traded in a real account. The rules were developed with hindsight, and this was one favorable period for QQQ and semiconductors. Do not read these figures as after-cost subscriber returns. Actual results can differ substantially, and losses can exceed the simulated decline. This backtest does not predict future returns.';
export const OFFER = 'Confirm your free signup to get 30% off a yearly TradeMind strategy subscription. Use the code with the same email address within 3 months of confirmation.';
export const REPLY_LINE = 'Reply to this email or write to me at eric@trademind.bot.';
export const NOBROKER = 'You keep your brokerage account and place every order yourself. TradeMind never connects to your broker or places trades.';

export const COPY: Record<'A' | 'B', { subject: string; intro: string[] }> = {
    A: {
        subject: 'A weekly QQQ brief you can preview',
        intro: [
            'TradeMind publishes AI Investor Copilot, a free weekly brief for self-directed investors.',
            'Each issue explains current market conditions, what the model indicates, scenarios to watch, and what could go wrong. Read a sample before deciding whether to subscribe.',
            'TradeMind also publishes optional paid strategy signals. One historical test is shown below so you can examine both the result and how it was generated.',
        ],
    },
    B: {
        subject: 'QQQ research with the assumptions shown',
        intro: [
            'A backtest result is more useful when you can inspect the assumptions behind it.',
            "TradeMind's free weekly AI Investor Copilot explains the market outlook, what the model indicates, and what could change that view. The paid strategies are separate and optional.",
            'Here is one published historical simulation, with its limitations.',
        ],
    },
};

export function escH(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

export interface V8Opts {
    token: string; firstName: string | null; baseUrl: string; mailingAddress: string; sigSep: string; useHtml?: boolean; force?: V8Variant; useC?: boolean;
}

export function renderV8(o: V8Opts): { subject: string; text: string; html: string | null; unsubUrl: string; variant: V8Variant } {
    const variant = o.force ?? v8Variant(o.token, !!o.useC);
    if (variant === 'C') return renderC(o);
    const c = COPY[variant];
    const first = (o.firstName ?? '').trim();
    const previewUrl = `${o.baseUrl}/r/${o.token}/p?s=1`;
    const subscribeUrl = `${o.baseUrl}/r/${o.token}/s?s=1`;
    const unsubUrl = `${o.baseUrl}/u/${o.token}`;
    const partUrl = (k: string) => `${o.baseUrl}/r/${o.token}/i?s=1&a=${k}`;
    const hi = first ? `Hi ${first},` : 'Hi,';

    const links = variant === 'A'
        ? [`Read the sample issue: ${previewUrl}`, `Or subscribe free: ${subscribeUrl}`]
        : [`Subscribe free: ${subscribeUrl}`, `Prefer to look first? Read a sample issue: ${previewUrl}`];
    const text = [
        hi, '', ...c.intro.flatMap((p) => [p, '']),
        'Four parts in every issue:', ...PARTS.map(([, n, d]) => `- ${n}: ${d}`), `What each issue covers: ${o.baseUrl}/r/${o.token}/i?s=1`, '',
        RESULT_H.toUpperCase(), RESULT_P1, '', RESULT_P2, '', LIMITS, '',
        ...links, '', 'Free weekly newsletter. Unsubscribe any time.', OFFER, '', NOBROKER, '', REPLY_LINE, '', 'Best, Eric', '',
        o.sigSep,
        `You're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: ${unsubUrl}`,
        `AI Investor Copilot by TradeMind, ${o.mailingAddress}`,
        'Education only, not investment advice. Investing involves risk, including loss.',
    ].join('\n');

    let html: string | null = null;
    if (o.useHtml) {
        const shell = INVITE_TEMPLATES_V5.FU.html as string;
        const startMarker = '<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;">Hi ';
        const a = shell.indexOf(startMarker);
        const z = shell.indexOf('</td></tr>\n<tr><td class="px t2"');
        if (a < 0 || z < 0) throw new Error('v8 html shell markers not found');
        const homeUrl = `${o.baseUrl}/r/${o.token}/h?s=1`;
        const pre = 'A free weekly brief, one historical test with its assumptions, and a sample issue to read first.';
        const head = shell.slice(0, a)
            .replace(/(<div style="display:none;max-height:0;overflow:hidden;opacity:0;">)[^<]*(&#847;)/, `$1${escH(pre)}$2`)
            .replace(/<title>[\s\S]*?<\/title>/, `<title>${escH(c.subject)}</title>`)
            .replace(/href="https:\/\/trademind\.bot"/g, `href="${homeUrl}"`);
        const tail = shell.slice(z).replace(
            /You(?:’|&rsquo;|')re receiving this invitation because[\s\S]*?Unsubscribe in one click<\/a>\./,
            `You’re getting this invite because you subscribed to an investing publication. <a href="${unsubUrl}" class="t" style="color:#aab4c5;text-decoration:underline;">Unsubscribe or snooze</a>.`
        );
        const P = (t: string, extra = '') => `<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;${extra}">${escH(t)}</p>`;
        const strip = PARTS.map(([k, n, d]) => `<td width="25%" valign="top" style="padding:12px 6px;${FONT}font-size:12px;line-height:1.4;"><a href="${escH(partUrl(k))}" class="pl" style="display:block;color:#8fb3ff;font-size:13px;font-weight:700;text-decoration:none;">${n} &rsaquo;</a><span class="t2" style="color:#aab4c5;">${d}</span></td>`).join('');
        const bigBtn = (u: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 12px;"><tr><td style="border-radius:8px;background:#2f6bff;"><a href="${escH(u)}" style="display:inline-block;padding:14px 32px;${FONT}font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escH(label)}</a></td></tr></table>`;
        const box = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;"><tr><td class="ob" style="padding:16px 18px;background:#1a2540;border-left:4px solid #2f6bff;border-radius:4px;${FONT}">`
            + `<p class="t" style="margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:.04em;color:#8fb3ff;text-transform:uppercase;">${escH(RESULT_H)}</p>`
            + `<p class="t" style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#e5e7eb;">${escH(RESULT_P1)}</p>`
            + `<p class="t" style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#e5e7eb;">${escH(RESULT_P2)}</p>`
            + `<p class="t2" style="margin:0;font-size:14px;line-height:1.55;color:#c3cad8;">${escH(LIMITS)}</p></td></tr></table>`;
        const cta = variant === 'A'
            ? bigBtn(previewUrl, 'Read the sample issue') + `<p class="t" style="margin:0 0 20px;font-size:15px;color:#e5e7eb;">or <a href="${escH(subscribeUrl)}" class="pl" style="color:#8fb3ff;font-weight:600;">Subscribe free</a></p>`
            : bigBtn(subscribeUrl, 'Subscribe free') + `<p class="t" style="margin:0 0 20px;font-size:15px;color:#e5e7eb;">Prefer to look first? <a href="${escH(previewUrl)}" class="pl" style="color:#8fb3ff;">Read a sample issue</a></p>`;
        const body = P(hi) + c.intro.map((p) => P(p)).join('')
            + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;border-top:1px solid #273449;border-bottom:1px solid #273449;"><tr>${strip}</tr></table><p class="t2" style="margin:0 0 18px;font-size:12px;color:#aab4c5;">Tap any part to see what it covers.</p>`
            + box + cta
            + `<p class="t" style="margin:0 0 6px;font-size:14px;line-height:1.55;color:#e5e7eb;"><b>Free weekly newsletter. Unsubscribe any time.</b></p>`
            + `<p class="t" style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#e5e7eb;">${escH(OFFER)}</p>`
            + P(NOBROKER, 'font-size:14px;color:#aab4c5;')
            + P(REPLY_LINE, 'font-size:15px;')
            + `<p class="t" style="margin:0 0 4px;font-size:16px;color:#e5e7eb;">Eric Huang</p><p class="t2" style="margin:0 0 24px;font-size:13px;color:#aab4c5;">Founder, TradeMind &middot; New York</p>`;
        html = (head + body + tail).replace(/\{\{mailing_address\}\}/g, escH(o.mailingAddress));
    }
    return { subject: c.subject, text, html, unsubUrl, variant };
}

// ---------------------------------------------------------------------------------------------------------------
// Variant C: the strategy explained in plain English, the labeled simulated result with its limits, the compounding
// arithmetic, and a "check it yourself" challenge. The main button opens /newsletter/verify (link kind c).
// ---------------------------------------------------------------------------------------------------------------
const C_SUBJECT = 'How QQQ LEAPS works, and how to check it yourself';
const C_PARTS: [string, string][] = [
    ['The core.', 'We buy a long-dated QQQ call option (a LEAPS) after pullbacks. QQQ holds the large Nasdaq technology companies, so this gives upside exposure for much less money than buying the shares. The most you can lose on the option is what you paid for it.'],
    ['The income.', 'When conditions allow, we sell shorter calls against it. Time decay works for the seller, and the premium softens small declines. It does not stop large ones.'],
    ['The semiconductor sleeve.', 'We sell SMH put spreads, which earn premium when semiconductors hold steady or rise. Losses are capped by the spread. This sleeve is in a test phase and has never traded in a real account.'],
];
const C_RESULT_P1 = 'From October 14, 2024 through October 13, 2026, QQQ LEAPS returned 229.48%, versus 49.46% for QQQ buy and hold. That is about 4.6 times the percentage return, or about 81.5% a year. The largest simulated drops were 14.59% and 22.88%.';
const C_COMPOUND = 'Two years is a short sample, and a pace like this is unlikely to repeat. Treat the figures as one historical test, not as a forecast.';
const C_LIMITS = 'This was not actual trading. Options were model-priced, costs can differ, the rules were developed with hindsight, and it was one favorable period for QQQ and semiconductors. The semiconductor sleeve produced most of its profit in the last six months. Do not treat any of it as a prediction, and do not read it as after-cost subscriber returns.';
const C_CHECK = 'Do not take my word for it. See the rules, the assumptions, the dated trades and the arithmetic, then tell me which assumption you would challenge first. I answer every reply.';

function renderC(o: V8Opts): { subject: string; text: string; html: string | null; unsubUrl: string; variant: V8Variant } {
    const first = (o.firstName ?? '').trim();
    const hi = first ? `Hi ${first},` : 'Hi,';
    const checkUrl = `${o.baseUrl}/r/${o.token}/c?s=1`;
    const previewUrl = `${o.baseUrl}/r/${o.token}/p?s=1`;
    const subscribeUrl = `${o.baseUrl}/r/${o.token}/s?s=1`;
    const unsubUrl = `${o.baseUrl}/u/${o.token}`;
    const intro1 = "I'm Eric, the founder of TradeMind in Queens, New York. Instead of asking you to trust a number, here is how our QQQ LEAPS strategy works, so you can try to break it.";
    const text = [
        hi, '', intro1, '', 'HOW IT WORKS, IN THREE PARTS',
        ...C_PARTS.map(([h, b], i) => `${i + 1}. ${h} ${b}`), '',
        RESULT_H.toUpperCase(), C_RESULT_P1, '', C_COMPOUND, '', C_LIMITS, '',
        'NOW CHECK IT YOURSELF', C_CHECK, '',
        `Check the backtest yourself: ${checkUrl}`, '',
        `Prefer to start with the brief? Read one complete issue: ${previewUrl}`,
        `Subscribe free: ${subscribeUrl}`, '',
        'Free weekly newsletter. Unsubscribe any time.', OFFER, '', NOBROKER, '', REPLY_LINE, '', 'Eric Huang', 'Founder, TradeMind', 'Queens, New York', '',
        o.sigSep,
        `You're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: ${unsubUrl}`,
        `AI Investor Copilot by TradeMind, ${o.mailingAddress}`,
        'Education only, not investment advice. Investing involves risk, including loss.',
    ].join('\n');

    let html: string | null = null;
    if (o.useHtml) {
        const shell = INVITE_TEMPLATES_V5.FU.html as string;
        const startMarker = '<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;">Hi ';
        const a = shell.indexOf(startMarker);
        const z = shell.indexOf('</td></tr>\n<tr><td class="px t2"');
        if (a < 0 || z < 0) throw new Error('v8 html shell markers not found');
        const homeUrl = `${o.baseUrl}/r/${o.token}/h?s=1`;
        const pre = 'How the strategy works, the simulated result with its limits, and how to check it yourself.';
        const head = shell.slice(0, a)
            .replace(/(<div style="display:none;max-height:0;overflow:hidden;opacity:0;">)[^<]*(&#847;)/, `$1${escH(pre)}$2`)
            .replace(/<title>[\s\S]*?<\/title>/, `<title>${escH(C_SUBJECT)}</title>`)
            .replace(/href="https:\/\/trademind\.bot"/g, `href="${homeUrl}"`);
        const tail = shell.slice(z).replace(
            /You(?:’|&rsquo;|')re receiving this invitation because[\s\S]*?Unsubscribe in one click<\/a>\./,
            `You’re getting this invite because you subscribed to an investing publication. <a href="${unsubUrl}" class="t" style="color:#aab4c5;text-decoration:underline;">Unsubscribe or snooze</a>.`
        );
        const P = (t: string, extra = '') => `<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;${extra}">${escH(t)}</p>`;
        const H = (t: string) => `<p class="t" style="margin:6px 0 10px;font-size:13px;font-weight:800;letter-spacing:.04em;color:#8fb3ff;text-transform:uppercase;">${escH(t)}</p>`;
        const steps = C_PARTS.map(([h, b], i) => `<tr><td valign="top" width="28" style="padding:0 0 12px;${FONT}font-size:16px;font-weight:800;color:#8fb3ff;">${i + 1}.</td><td style="padding:0 0 12px;${FONT}font-size:15px;line-height:1.55;color:#e5e7eb;"><b>${escH(h)}</b> ${escH(b)}</td></tr>`).join('');
        const box = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;"><tr><td class="ob" style="padding:16px 18px;background:#1a2540;border-left:4px solid #2f6bff;border-radius:4px;${FONT}">`
            + `<p class="t" style="margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:.04em;color:#8fb3ff;text-transform:uppercase;">${escH(RESULT_H)}</p>`
            + `<p class="t" style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#e5e7eb;">${escH(C_RESULT_P1)}</p>`
            + `<p class="t" style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#e5e7eb;">${escH(C_COMPOUND)}</p>`
            + `<p class="t2" style="margin:0;font-size:14px;line-height:1.55;color:#c3cad8;">${escH(C_LIMITS)}</p></td></tr></table>`;
        const btn = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;"><tr><td style="border-radius:8px;background:#2f6bff;"><a href="${escH(checkUrl)}" style="display:inline-block;padding:14px 32px;${FONT}font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Check the backtest yourself</a></td></tr></table>`;
        const body = P(hi) + P(intro1)
            + H('How it works, in three parts') + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;">${steps}</table>`
            + box + H('Now check it yourself') + P(C_CHECK) + btn
            + `<p class="t" style="margin:0 0 6px;font-size:15px;color:#e5e7eb;">Prefer to start with the brief? <a href="${escH(previewUrl)}" class="pl" style="color:#8fb3ff;">Read one complete issue</a> or <a href="${escH(subscribeUrl)}" class="pl" style="color:#8fb3ff;font-weight:600;">Subscribe free</a>.</p>`
            + `<p class="t" style="margin:14px 0 6px;font-size:14px;line-height:1.55;color:#e5e7eb;"><b>Free weekly newsletter. Unsubscribe any time.</b></p>`
            + `<p class="t" style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#e5e7eb;">${escH(OFFER)}</p>`
            + P(NOBROKER, 'font-size:14px;color:#aab4c5;')
            + P(REPLY_LINE, 'font-size:15px;')
            + `<p class="t" style="margin:0 0 4px;font-size:16px;color:#e5e7eb;">Eric Huang</p><p class="t2" style="margin:0 0 24px;font-size:13px;color:#aab4c5;">Founder, TradeMind &middot; Queens, New York</p>`;
        html = (head + body + tail).replace(/\{\{mailing_address\}\}/g, escH(o.mailingAddress));
    }
    return { subject: C_SUBJECT, text, html, unsubUrl, variant: 'C' };
}
