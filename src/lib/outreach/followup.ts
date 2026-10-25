import { INVITE_TEMPLATES_V5 } from './templates-v5';

/** Follow-up steps (queue/sends step numbers) and their day offsets from the first email. */
export const STAGE_BY_STEP: Record<number, string> = { 2: 'FU1', 5: 'FU2', 6: 'FU3', 7: 'FINAL', 8: 'FU4' };
export const STEP_DAYS: Record<number, number> = { 2: 7, 5: 14, 6: 21, 7: 28 };
/** Follow-ups whose wording describes one specific sample issue: send the reader straight to it. */
export const PREVIEW_VARIANT: Record<string, 'ml' | 'bt'> = { T1_C_FU2: 'ml', T4_C_FU2: 'bt' };
export const VARIANT_PATH: Record<string, string> = {
    ml: '/newsletter/issues/2026-09-10-what-ml-can-and-cannot-do',
    bt: '/newsletter/issues/2026-09-17-backtests-only-matter-if-assumptions-survive',
};

function esc(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const F = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

/** Plain text footer shared by all follow-ups (the invitation footer), starting at the signature separator. */
export function followupFooterText(): string {
    const b = INVITE_TEMPLATES_V5.FU.body;
    return b.slice(b.indexOf('{{sig_sep}}'));
}

/** Build the HTML email from the plain body, reusing the dark invitation layout (header, button, offer box, footer). */
export function followupHtml(body: string, preheader: string): string {
    const shell = INVITE_TEMPLATES_V5.FU.html as string;
    const startMarker = '<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;">Hi ';
    const a = shell.indexOf(startMarker);
    const z = shell.indexOf('</td></tr>\n<tr><td class="px t2"');
    if (a < 0 || z < 0) throw new Error('follow-up shell markers not found');
    let head = shell.slice(0, a);
    const tail = shell.slice(z);
    head = head.replace(/(<div style="display:none;max-height:0;overflow:hidden;opacity:0;">)[^<]*(&#847;)/, `$1${esc(preheader)}$2`);
    const out: string[] = [];
    for (const block of body.split(/\n\s*\n/)) {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) continue;
        if (lines[0] === '{{sender_name}}') {
            out.push(`<p class="t" style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#e5e7eb;">Reply to this email or write to me at eric@trademind.bot.</p>`);
            out.push(`<p class="t" style="margin:0 0 4px;font-size:16px;color:#e5e7eb;">{{sender_name}}</p><p class="t2" style="margin:0 0 24px;font-size:13px;color:#aab4c5;">Founder, TradeMind &middot; New York</p>`);
            continue;
        }
        if (/entitled to 30% off/.test(block)) {
            out.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td class="ob" style="padding:12px 14px;background:#1a2540;border-left:3px solid #2f6bff;border-radius:4px;${F}font-size:14px;line-height:1.5;color:#e5e7eb;">${esc(lines.join(' '))}</td></tr></table>`);
            continue;
        }
        const m = lines.length === 1 ? lines[0].match(/^(.+): \{\{(subscribe|preview)_url\}\}$/) : null;
        if (m && m[2] === 'subscribe') {
            out.push(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;"><tr><td style="border-radius:8px;background:#2f6bff;"><a href="{{subscribe_url}}" style="display:inline-block;padding:13px 26px;${F}font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(m[1])}</a></td></tr></table>`);
            continue;
        }
        if (m && m[2] === 'preview') {
            out.push(`<p class="t" style="margin:0 0 18px;font-size:15px;color:#e5e7eb;"><a href="{{preview_url}}" class="pl" style="color:#8fb3ff;">${esc(m[1])}</a></p>`);
            continue;
        }
        out.push(`<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;">${lines.map(esc).join('<br>')}</p>`);
    }
    return head + out.join('\n') + tail;
}
