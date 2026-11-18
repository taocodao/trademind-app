import { renderSeq7, type Seq7Opts } from './copy-seq7';

/**
 * Simple retail version of the seven invitation emails: plain paragraphs in a light HTML wrap, ONE link, a short stop line and the
 * address. The wording comes from the production emails (renderSeq7) so no claim, figure or disclosure is rewritten. The single link
 * opens the free sample issue, and the person subscribes from there. Email 7 asks for the study, so its one link is the study page.
 */
const STOP = 'Reply stop and I will not write again.';
const DISCLAIMER = 'Educational research, not personalized investment advice. Investing involves risk, including loss.';
const DROP = /^(Decline \d+%:|Subscribe free:|Apply to|Would you have|A\. |B\. |C\. |Read the rules|See (a|the) |20 seats|THIS WEEK|Plans and pricing|Free subscribers|Reply to this|Eric Huang|Subscribe to the free weekly|EXPLORE:|Weekly by default)/;
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderRetailSimple(o: Seq7Opts & { linkBase: string }): { subject: string; text: string; html: string } {
    const n = o.n ?? 1;
    const token = o.token;
    const step = o.step;
    const full = renderSeq7({ ...o, baseUrl: o.linkBase, audience: 'retail', noChart: true });
    const blocks = full.text.split('\n\n');
    const hi = blocks[0];
    const paras: string[] = [];
    let seenHead = false;
    for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i];
        if (/^THIS WEEK/.test(b)) break;
        if (/^EXPLORE:/.test(b)) continue;
        if (!seenHead) {
            // The first body block starts with an uppercase heading line. Drop the heading and keep the sentences.
            const lines = b.split('\n');
            if (lines[0] === lines[0].toUpperCase() && lines.length > 1) { paras.push(...lines.slice(1)); seenHead = true; continue; }
        }
        seenHead = true;
        if (DROP.test(b)) continue;
        if (/^HELP TEST THE MODEL/.test(b)) continue;
        paras.push(...b.split('\n'));
    }
    // Study block (emails 3, 5 and 7) comes after the heading line HELP TEST THE MODEL, FREE.
    const study: string[] = [];
    const si = n === 7 ? blocks.findIndex((b) => /^HELP TEST THE MODEL/.test(b)) : -1;
    if (si >= 0) study.push(...blocks[si].split('\n').slice(1));
    const sim = (full.text.match(/^Simulation, .*$/m) || [''])[0];
    const nobroker = (full.text.match(/^You keep your own brokerage account.*$/m) || [''])[0];
    const off = (full.text.match(/^Free subscribers get 30% off.*$/m) || [''])[0];
    if (!sim || !nobroker) throw new Error('retail template missing simulation or broker line');
    const kind = n === 7 ? 'f' : 'is';
    const url = `${o.linkBase}/r/${token}/${kind}?s=${step}`;
    const label = n === 7 ? 'Apply to the study program' : 'See this week\u2019s free issue and subscribe from there';
    const body: string[] = [hi, ...paras.filter((p) => p && p !== hi).map((p) => p.replace('This week\u2019s issue is below, so you can judge it', 'This week\u2019s issue is on the page linked below, so you can judge it')), ...study, sim, nobroker, `${label}: ${url}`];
    if (n !== 7 && off) body.push(off);
    const addr = o.mailingAddress;
    const text = `${body.join('\n\n')}\n\nEric Huang\nFounder, TradeMind\n\n${STOP}\n${addr}\n${DISCLAIMER}`;
    const ph = body.map((t) => t.startsWith(`${label}:`) ? `<p><a href="${esc(url)}">${esc(label)}</a></p>` : `<p>${esc(t)}</p>`).join('');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(full.subject)}</title></head><body style="margin:0;padding:16px;background:#ffffff;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:560px;">${ph}<p>Eric Huang<br>Founder, TradeMind</p><p style="font-size:12px;color:#777">${esc(STOP)}<br>${esc(addr)}<br>${esc(DISCLAIMER)}</p></div></body></html>`;
    return { subject: full.subject, text, html };
}
