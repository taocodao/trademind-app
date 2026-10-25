/**
 * Founding program first email and follow-ups for the retail outreach lane.
 * Switched on by outreach_settings.copy_prog_start (unset means off). Applies to first emails (step 1) sent after that
 * time; follow-ups follow the contact's first email: people who got this message get the program follow-ups.
 * Links are the campaign's own tracked redirects: /r/<token>/f (apply) and /r/<token>/x (sample briefing).
 * Template labels stored in outreach_sends: P1, then P_FU1, P_FU2, P_FINAL.
 */
import { INVITE_TEMPLATES_V5 } from './templates-v5';

export const PROG_TEMPLATE = 'P1';
/** Follow-up step numbers used by the existing sequence: 2 (day 7), 5 (day 14), 7 (day 28). Step 6 is skipped. */
export const PROG_FOLLOWUP_STEPS = [2, 5, 7] as const;
export const PROG_LABEL: Record<number, string> = { 2: 'P_FU1', 5: 'P_FU2', 7: 'P_FINAL' };

const SUBJECT = 'A research panel for QQQ investors';
const SUBJECT_FU: Record<number, string> = {
    2: 'The TradeMind research panel: a sample first',
    5: 'What a quiet day looks like at TradeMind',
    7: 'Last note about the TradeMind research panel',
};
const NOBROKER = 'You keep your brokerage account and place every order yourself. TradeMind never connects to your broker or places trades.';
const SIM = 'Every TradeMind result shown so far comes from a simulation, not live trading.';

function escH(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

export interface ProgOpts {
    token: string; firstName: string | null; baseUrl: string; mailingAddress: string; sigSep: string; useHtml?: boolean;
    /** Undefined for the first email, or the follow-up step number. */
    step?: number;
}

export function renderProg(o: ProgOpts): { subject: string; text: string; html: string | null; unsubUrl: string } {
    const step = o.step ?? 1;
    const fu = step !== 1;
    const first = (o.firstName ?? '').trim();
    const hi = first ? `Hi ${first},` : 'Hi,';
    const s = fu ? step : 1;
    const applyUrl = `${o.baseUrl}/r/${o.token}/f?s=${s}`;
    const sampleUrl = `${o.baseUrl}/r/${o.token}/x?s=${s}`;
    const unsubUrl = `${o.baseUrl}/u/${o.token}`;
    const subject = fu ? SUBJECT_FU[step] ?? SUBJECT_FU[2] : SUBJECT;

    let paras: string[];
    if (!fu) {
        paras = [
            'I am building TradeMind, quantitative research with clear strategy updates for self-directed QQQ investors.',
            'I am looking for 30 investors to try it free for 30 days and tell me what works and what does not. If you would rather skip the feedback, there is a founding price instead.',
        ];
    } else {
        const line: Record<number, string> = {
            2: 'You can see a full sample briefing before applying.',
            5: 'Many days the model says no change. The sample shows what a quiet day looks like.',
            7: 'This is my last note about the panel. The sample and the application stay open.',
        };
        paras = [
            'A short follow-up on the TradeMind research panel: 30 days of Research and Tracking free, no card, and nothing turns into a paid plan automatically.',
            line[step] ?? line[2],
        ];
    }
    const points = [
        'Free for 30 days, no card needed to apply.',
        'Then keep it free with one short monthly activity, or choose a founding price from $19 per month.',
        'You never need to trade, refer anyone, or write a review.',
    ];

    const text = [
        hi, '', ...paras.flatMap((p) => [p, '']),
        ...(fu ? [] : [...points.map((p) => `- ${p}`), '']),
        `Details and application: ${applyUrl}`,
        `See a sample daily briefing first: ${sampleUrl}`, '',
        SIM, NOBROKER, '', 'Best, Eric', '', o.sigSep,
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
        if (a < 0 || z < 0) throw new Error('program html shell markers not found');
        const pre = 'Free for 30 days, no card. A sample briefing to read first.';
        const head = shell.slice(0, a)
            .replace(/(<div style="display:none;max-height:0;overflow:hidden;opacity:0;">)[^<]*(&#847;)/, `$1${escH(pre)}$2`)
            .replace(/<title>[\s\S]*?<\/title>/, `<title>${escH(subject)}</title>`)
            .replace(/href="https:\/\/trademind\.bot"/g, `href="${o.baseUrl}/r/${o.token}/h?s=${s}"`);
        const tail = shell.slice(z).replace(
            /You(?:’|&rsquo;|')re receiving this invitation because[\s\S]*?Unsubscribe in one click<\/a>\./,
            `You’re getting this invite because you subscribed to an investing publication. <a href="${unsubUrl}" class="t" style="color:#aab4c5;text-decoration:underline;">Unsubscribe or snooze</a>.`
        );
        const P = (t: string, extra = '') => `<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;${extra}">${escH(t)}</p>`;
        const btn = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 12px;"><tr><td style="border-radius:8px;background:#2f6bff;"><a href="${escH(applyUrl)}" style="display:inline-block;padding:14px 32px;${FONT}font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;">Apply to the research panel</a></td></tr></table>`
            + `<p class="t" style="margin:0 0 20px;font-size:15px;color:#e5e7eb;">Or <a href="${escH(sampleUrl)}" class="pl" style="color:#8fb3ff;font-weight:600;">see a sample daily briefing</a> first.</p>`;
        const list = fu ? '' : `<ul class="t" style="margin:0 0 18px;padding-left:20px;font-size:15px;line-height:1.6;color:#e5e7eb;">${points.map((p) => `<li>${escH(p)}</li>`).join('')}</ul>`;
        const body = P(hi) + paras.map((p) => P(p)).join('') + list + btn
            + P(SIM, 'font-size:14px;color:#aab4c5;') + P(NOBROKER, 'font-size:14px;color:#aab4c5;')
            + `<p class="t" style="margin:0 0 4px;font-size:16px;color:#e5e7eb;">Eric Huang</p><p class="t2" style="margin:0 0 24px;font-size:13px;color:#aab4c5;">Founder, TradeMind &middot; New York</p>`;
        html = (head + body + tail).replace(/\{\{mailing_address\}\}/g, escH(o.mailingAddress));
    }
    return { subject, text, html, unsubUrl };
}
