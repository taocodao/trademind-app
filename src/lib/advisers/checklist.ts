/**
 * The adviser checklist page: five benchmarks to ask for before a QQQ strategy goes into a client plan.
 * Built from the benchmark section of Issue 1. No new figures and no performance claims; results are linked, not restated.
 * Pure function, no database. The route gates it behind the setting adviser_checklist.
 */
import { ENGAGE_SCRIPT } from '@/lib/newsletter/web-issue';

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const CHECKLIST_TITLE = 'Five benchmarks to ask for before a QQQ strategy goes into a client plan';

export const CHECKLIST_ITEMS: { name: string; question: string }[] = [
    { name: 'Buy and hold QQQ', question: 'Does the strategy add value over plain market exposure?' },
    { name: 'A 2x leveraged QQQ ETF', question: 'Does the options structure beat simple packaged leverage?' },
    { name: 'Static LEAPS with no model', question: 'Does the timing model add value?' },
    { name: 'Rules based PMCC with no model', question: 'Does the regime adjusted overlay add value?' },
    { name: 'QQQ plus cash at matched risk', question: 'Is the extra return just extra risk?' },
];

export const CHECKLIST_INTRO = 'If a strategy is more complex than buying QQQ or a leveraged QQQ ETF, does that complexity earn its keep? These are the five benchmarks every QQQ options strategy should face. Ask for each one, on the same dates and after costs.';
export const CHECKLIST_BETTER = 'Higher return alone is not enough. A strategy is better only if it improves results after costs on at least one of these: return per unit of drawdown, recovery time, worst rolling period, or consistency across different regimes.';
export const CHECKLIST_FOOT = 'Written by Eric Huang, Founder, TradeMind. TradeMind publishes educational research. It is not personalized investment advice. It never connects to a brokerage or places trades.';

export function checklistHtml(o: { token: string }): string {
    const t = /^[A-Za-z0-9_-]{10,11}$/.test(o.token) ? o.token : '';
    const brief = t ? `/r/${t}/sw?s=21` : '/newsletter/join';
    const sim = t ? `/r/${t}/v?s=21` : '/simulated-record';
    const rows = CHECKLIST_ITEMS.map((i, k) => `<li><span class="n">${k + 1}</span><div><b>${esc(i.name)}</b><p>${esc(i.question)}</p></div></li>`).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(CHECKLIST_TITLE)} | TradeMind</title><style>
body{margin:0;background:#f6f7fb;color:#1c2333;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
.w{max-width:720px;margin:0 auto;padding:36px 20px 64px}
.e{font:800 13px/1 inherit;letter-spacing:.06em;color:#2f6bff;margin:0 0 14px}
h1{font-size:clamp(26px,5vw,34px);line-height:1.2;margin:0 0 14px}
.l{font-size:17px;color:#44506a;margin:0 0 24px}
ol{list-style:none;margin:0;padding:0;display:grid;gap:12px}
li{display:flex;gap:14px;align-items:flex-start;background:#fff;border:1px solid #dfe3ee;border-radius:12px;padding:16px 18px}
.n{flex:none;width:30px;height:30px;border-radius:50%;background:#2f6bff;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
li b{display:block;font-size:17px}li p{margin:2px 0 0;color:#44506a}
.b{margin:26px 0 0;background:#fff;border:1px solid #dfe3ee;border-left:4px solid #2f6bff;border-radius:12px;padding:16px 18px}
.b h2{font-size:18px;margin:0 0 6px}.b p{margin:0;color:#44506a}
.c{margin-top:26px}.c a.btn{display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;font-weight:700;border-radius:8px;padding:13px 24px}
.c p{color:#44506a;margin:0 0 12px}.c a.t{color:#2f6bff;font-weight:700}
.f{margin-top:40px;padding-top:16px;border-top:1px solid #dfe3ee;font-size:13px;color:#6a7488}
@media print{body{background:#fff}.c{display:none}li,.b{break-inside:avoid}}
</style></head><body><div class="w">
<p class="e">ONE PAGE CHECKLIST</p>
<h1>${esc(CHECKLIST_TITLE)}</h1>
<p class="l">${esc(CHECKLIST_INTRO)}</p>
<ol>${rows}</ol>
<div class="b"><h2>What better means</h2><p>${esc(CHECKLIST_BETTER)}</p></div>
<div class="c"><p>TradeMind's own comparison, with its assumptions and limits, is on the <a class="t" href="${sim}">simulation page</a>. A new short read on QQQ arrives weekly if you want it.</p><a class="btn" href="${brief}">Get the free weekly brief</a></div>
<p class="f">${esc(CHECKLIST_FOOT)}</p>
</div>${ENGAGE_SCRIPT}</body></html>`;
}
