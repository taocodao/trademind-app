/**
 * Waiting-story follow-up for people who have not responded to the first email. One email with the labeled chart image,
 * a link that opens the full simulated record, and the usual subscribe link. Used in the first follow-up slot (step 2)
 * for contacts who received the new first email through SendGrid, and in the close-out slot (step 7) for contacts whose
 * step 2 was the re-introduced first email. Off unless outreach_settings.copy_ws_start is set.
 * Facts (simulation data): one SMH spread opened Oct 14, 2024 and closed Oct 15 at a loss; no positions until the QQQ LEAPS
 * entry on Sept 2, 2025; on that day the simulation was down about 5% and QQQ buy and hold was up about 14%.
 */
import { INVITE_TEMPLATES_V5 } from './templates-v5';
import { REPLY_LINE } from './copy-v8';

const SUBJECT = 'Look at the flat stretch first';
const PRE = 'Almost 11 months with no positions in a QQQ simulation, and what it looked like next to QQQ.';
export const IMG = 'https://trademind.bot/campaigns/waiting-chart.png';
export const ALT = 'Simulated QQQ LEAPS value versus QQQ buy and hold, Oct 14, 2024 to Oct 13, 2026. The simulated line is flat until the first QQQ LEAPS entry on Sept 2, 2025.';
const P1 = 'Here is the part of our QQQ simulation I would look at first: the long flat stretch at the start of the chart.';
export const P2 = 'After one early SMH loss, the simulation held no positions until September 2, 2025, when its QQQ LEAPS entry conditions first passed. On the day it entered, it was down about 5% and QQQ buy and hold was up about 14%.';
export const CAP = 'Simulation, Oct 14, 2024 to Oct 13, 2026. The grey dashed line is QQQ buy and hold, a comparison only.';
const P3 = 'Would you have kept following it, asked for a clearer explanation, or walked away? There is no right answer. The rules were developed with hindsight, options were model-priced, and the later result came in one favorable window for QQQ and semiconductors. This is a simulation, not a real account, and it does not show that waiting was the better choice.';
const FINAL_LINE = 'This is my last email unless you subscribe. Nothing more will come from TradeMind after this.';
const OFFER = 'Confirm your free signup to get 30% off a yearly TradeMind strategy subscription. Use the code with the same email address within 3 months of confirmation.';
const NOBROKER = 'You keep your brokerage account and place every order yourself. TradeMind never connects to your broker or places trades.';

function escH(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

export interface WsOpts {
    token: string; firstName: string | null; baseUrl: string; mailingAddress: string; sigSep: string; useHtml?: boolean; step: number; last?: boolean;
}

export function renderWS(o: WsOpts): { subject: string; text: string; html: string | null; unsubUrl: string } {
    const first = (o.firstName ?? '').trim();
    const hi = first ? `Hi ${first},` : 'Hi,';
    const rec = `${o.baseUrl}/r/${o.token}/v?s=${o.step}`;
    const sub = `${o.baseUrl}/r/${o.token}/s?s=${o.step}`;
    const unsubUrl = `${o.baseUrl}/u/${o.token}`;
    const text = [
        hi, '', P1, '', P2, '', `[Chart] ${ALT}`, CAP, `Open the full chart and the trades behind it: ${rec}`, '', P3, '',
        `Open the full simulated record: ${rec}`, `Get the free weekly brief that explains the model's view: ${sub}`, '',
        ...(o.last ? [FINAL_LINE, ''] : []),
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
        if (a < 0 || z < 0) throw new Error('ws html shell markers not found');
        const homeUrl = `${o.baseUrl}/r/${o.token}/h?s=${o.step}`;
        const head = shell.slice(0, a)
            .replace(/(<div style="display:none;max-height:0;overflow:hidden;opacity:0;">)[^<]*(&#847;)/, `$1${escH(PRE)}$2`)
            .replace(/<title>[\s\S]*?<\/title>/, `<title>${escH(SUBJECT)}</title>`)
            .replace(/href="https:\/\/trademind\.bot"/g, `href="${homeUrl}"`);
        const tail = shell.slice(z).replace(
            /You(?:’|&rsquo;|')re receiving this invitation because[\s\S]*?Unsubscribe in one click<\/a>\./,
            `You’re getting this invite because you subscribed to an investing publication. <a href="${unsubUrl}" class="t" style="color:#aab4c5;text-decoration:underline;">Unsubscribe or snooze</a>.`
        );
        const P = (t: string, extra = '') => `<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;${extra}">${escH(t)}</p>`;
        const img = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;"><tr><td><a href="${escH(rec)}"><img src="${IMG}" alt="${escH(ALT)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:6px;"></a></td></tr></table>`
            + `<p class="t2" style="margin:0 0 18px;font-size:12px;line-height:1.5;color:#aab4c5;">${escH(CAP)}</p>`;
        const btn = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;"><tr><td style="border-radius:8px;background:#2f6bff;"><a href="${escH(rec)}" style="display:inline-block;padding:14px 32px;${FONT}font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Open the full chart and trades</a></td></tr></table>`;
        const body = P(hi) + P(P1) + P(P2) + img + P(P3) + btn
            + `<p class="t" style="margin:0 0 6px;font-size:15px;color:#e5e7eb;">Prefer the weekly brief first? <a href="${escH(sub)}" class="pl" style="color:#8fb3ff;font-weight:600;">Subscribe free</a>.</p>`
            + (o.last ? P(FINAL_LINE, 'font-size:15px;margin-top:12px;') : '')
            + `<p class="t" style="margin:14px 0 6px;font-size:14px;line-height:1.55;color:#e5e7eb;"><b>Free weekly newsletter. Unsubscribe any time.</b></p>`
            + `<p class="t" style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#e5e7eb;">${escH(OFFER)}</p>`
            + P(NOBROKER, 'font-size:14px;color:#aab4c5;')
            + P(REPLY_LINE, 'font-size:15px;')
            + `<p class="t" style="margin:0 0 4px;font-size:16px;color:#e5e7eb;">Eric Huang</p><p class="t2" style="margin:0 0 24px;font-size:13px;color:#aab4c5;">Founder, TradeMind &middot; Queens, New York</p>`;
        html = (head + body + tail).replace(/\{\{mailing_address\}\}/g, escH(o.mailingAddress));
    }
    return { subject: SUBJECT, text, html, unsubUrl };
}
