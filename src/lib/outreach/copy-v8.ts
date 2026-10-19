/**
 * First-touch invitation copy v8: the simulated back test result and its limitations sit in one block next to the
 * Subscribe free button, with the unsubscribe and offer lines directly under it. Two variants are tested 50/50 by a hash of the
 * token: A (Read the sample issue is the big button) and B (Subscribe free is the big button).
 * Applies only to first emails (step 1) sent after outreach_settings.copy_v8_start. Unset means off. Follow-ups are unchanged.
 * The variant is recomputable from the token, so no extra storage is needed for analysis.
 */
import { createHash } from 'crypto';
import { INVITE_TEMPLATES_V5 } from './templates-v5';

export type V8Variant = 'A' | 'B';
export function v8Variant(token: string): V8Variant {
    return parseInt(createHash('sha256').update(`${token}:copy-v8`).digest('hex').slice(0, 8), 16) % 2 === 0 ? 'A' : 'B';
}

const PARTS: [string, string, string][] = [
    ['weather', 'Market weather', 'current conditions'],
    ['readout', 'Copilot readout', 'what the model indicates'],
    ['flight', 'Flight plan', 'scenarios to watch'],
    ['turbulence', 'Turbulence test', 'what could invalidate the outlook'],
];
const RESULT_H = 'Two-year simulated backtest, not actual trading';
const RESULT_P1 = 'From October 14, 2024 through October 13, 2026, the QQQ LEAPS simulation, including its test-phase SMH put-spread sleeve, showed a total return of 229.48%. QQQ buy and hold returned 49.46% over the same period. That is about 4.6 times the percentage return, not 4.6 times the ending account value.';
const RESULT_P2 = 'The largest simulated decline from a previous portfolio high was 14.59%, compared with 22.88% for QQQ buy and hold.';
const LIMITS = 'These are hypothetical results, not returns earned in a real account. Options were model-priced, not valued using actual option quotes. The SMH sleeve has never traded in a real account. The rules were developed with hindsight, and this was one favorable period for QQQ and semiconductors. Do not read these figures as after-cost subscriber returns. Actual results can differ substantially, and losses can exceed the simulated decline. This backtest does not predict future returns.';
const OFFER = 'Confirm your free signup to get 30% off a yearly TradeMind strategy subscription. Use the code with the same email address within 3 months of confirmation.';
const NOBROKER = 'You keep your brokerage account and place every order yourself. TradeMind never connects to your broker or places trades.';

const COPY: Record<V8Variant, { subject: string; intro: string[] }> = {
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

function escH(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

export interface V8Opts {
    token: string; firstName: string | null; baseUrl: string; mailingAddress: string; sigSep: string; useHtml?: boolean; force?: V8Variant;
}

export function renderV8(o: V8Opts): { subject: string; text: string; html: string | null; unsubUrl: string; variant: V8Variant } {
    const variant = o.force ?? v8Variant(o.token);
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
        ...links, '', 'Free weekly newsletter. Unsubscribe any time.', OFFER, '', NOBROKER, '', 'Best, Eric', '',
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
            + `<p class="t" style="margin:0 0 4px;font-size:16px;color:#e5e7eb;">Eric Huang</p><p class="t2" style="margin:0 0 24px;font-size:13px;color:#aab4c5;">Founder, TradeMind &middot; New York</p>`;
        html = (head + body + tail).replace(/\{\{mailing_address\}\}/g, escH(o.mailingAddress));
    }
    return { subject: c.subject, text, html, unsubUrl, variant };
}
