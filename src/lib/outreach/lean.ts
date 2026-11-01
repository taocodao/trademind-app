/**
 * Lean rendering for outreach emails: a light, mostly text message built from the approved plain text.
 * No dark layout, no emoji, no buttons, no image, no link tiles. Only the links that carry an action stay.
 * The wording of every paragraph is unchanged, so approved claims and limits are kept exactly.
 */
import { esc } from './copy-seq7';

const DROP_LABELS = new Set(['Plans and pricing', 'Study program', 'trademind.bot', 'Virtual accounts', 'Simulation details']);
const URL_RE = /(https?:\/\/\S+)$/;

function stripEmoji(s: string): string {
    return s.replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\uFE0F\u200D]/gu, '').replace(/ {2,}/g, ' ').trim();
}

export function leanify<T extends { subject: string; text: string; html: string }>(msg: T): T {
    const kept: string[] = [];
    for (const raw of msg.text.split('\n')) {
        const line = stripEmoji(raw);
        if (line.startsWith('EXPLORE:')) continue;
        const m = /^([^:]+): https?:\/\/\S+$/.exec(line);
        if (m && DROP_LABELS.has(m[1])) continue;
        kept.push(line);
    }
    const text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
    const paras = text.split(/\n{2,}/);
    const body = paras.map((para) => {
        const lines = para.split('\n').map((l) => {
            const u = URL_RE.exec(l);
            if (u) {
                const before = l.slice(0, u.index).replace(/:\s*$/, '').trim();
                const cut = before.lastIndexOf('. ');
                const head = cut >= 0 ? before.slice(0, cut + 2) : '';
                const label = cut >= 0 ? before.slice(cut + 2) : before;
                return `${esc(head)}<a href="${esc(u[1])}" style="color:#1a56db;">${esc(label || 'Open')}</a>`;
            }
            const caps = l.length > 3 && l === l.toUpperCase() && /[A-Z]/.test(l);
            return caps ? `<strong>${esc(l)}</strong>` : esc(l);
        });
        return `<p style="margin:0 0 14px;">${lines.join('<br>')}</p>`;
    }).join('');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(msg.subject)}</title></head><body style="margin:0;padding:16px;background:#ffffff;"><div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;">${body}</div></body></html>`;
    return { ...msg, text, html };
}
