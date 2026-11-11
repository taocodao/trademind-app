/**
 * The newsletter on the website. The weekly page uses the same layout and the same live facts as the first
 * invitation email (copy-seq7), so the page and the email a reader may have seen match. The daily page
 * shows the latest approved daily edition. Pure HTML builders: no database access here except the helpers
 * that are passed in.
 */
import {
    C, F, row, sp, card, btn, btnPair, pill, P, esc, why, example, FOCUS, THEME, THEME_SUB, DISCOUNT, NOBROKER, weeklyIssue,
    type Seq7Opts, type IssueFacts,
} from '@/lib/outreach/copy-seq7';

const ADDRESS = process.env.NEWSLETTER_MAILING_ADDRESS || '151-58 24th Rd, Whitestone, NY 11357, United States';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

const PATHS: Record<string, string> = { pl: '/plans', f: '/founding', va: '/live-record?demo=1', v: '/simulated-record', h: '/', i: '/newsletter/current' };
const link = (k: string) => PATHS[k] ?? '/';

const btnStyle = (primary: boolean) =>
    `display:block;width:100%;cursor:pointer;border-radius:10px;padding:${primary ? '14px 18px' : '13px 18px'};font:800 ${primary ? 16 : 15}px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;` +
    (primary ? `background:${C.btn};color:#ffffff;border:1px solid ${C.btn};` : `background:${C.card};color:${C.blue};border:1px solid #3a4a70;`);

/** The two subscribe buttons. With a personal link they are plain links; otherwise an email box and two buttons. */
export function subscribeBlock(token: string, heading = 'Get it in your inbox'): string {
    const head = `<div style="${F}font-size:18px;font-weight:800;color:${C.fg};padding-bottom:4px;">${esc(heading)}</div>${P('Free. Choose weekly or daily. You go straight to the current issue, and we email you the link.', 14, C.muted)}`;
    if (token) {
        const u = (k: string) => `${BASE_URL}/r/${token}/${k}?s=1`;
        return card(`${head}${btnPair(u('sw'), 'Subscribe weekly', u('sd'), 'Subscribe daily')}`, C.btn);
    }
    const form = `<form class="tm-sub" onsubmit="return false" style="margin:0;">
<input class="tm-email" type="email" required placeholder="you@example.com" aria-label="Email address" autocomplete="email" style="display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:13px 14px;border-radius:10px;border:1px solid ${C.line};background:#0b0f17;color:${C.fg};font:500 16px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<input class="tm-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;width:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" style="padding-right:5px;" valign="top"><button type="button" data-c="weekly" style="${btnStyle(true)}">Subscribe weekly</button></td><td width="50%" style="padding-left:5px;" valign="top"><button type="button" data-c="daily" style="${btnStyle(false)}">Subscribe daily</button></td></tr></table>
<p class="tm-msg" role="status" style="margin:10px 0 0;${F}font-size:13px;color:${C.amber};"></p>
<p style="margin:10px 0 0;${F}font-size:12px;line-height:1.5;color:${C.muted};">By subscribing you agree to receive The AI Systematic Investor and TradeMind offers. Unsubscribe any time.</p>
</form>`;
    return card(`${head}${form}`, C.btn);
}

const SCRIPT = `<script>
(function(){
  var forms=document.querySelectorAll('form.tm-sub');
  forms.forEach(function(f){
    var m=f.querySelector('.tm-msg'),e=f.querySelector('.tm-email'),hp=f.querySelector('.tm-hp'),bs=f.querySelectorAll('button');
    function off(v){bs.forEach(function(b){b.disabled=v;b.style.opacity=v?'.6':'1';});}
    function go(c){
      if(!e.reportValidity())return;
      off(true);m.textContent='Subscribing...';
      var p=new URLSearchParams(location.search);
      fetch('/api/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:e.value,consent:true,source:'web-brief',cadence:c,website:hp.value,medium:p.get('utm_medium'),campaign:p.get('utm_campaign'),referralId:p.get('ref')})})
      .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
      .then(function(x){if(x.ok){location.href=x.d.redirect||('/newsletter/thanks?c='+c);}else{m.textContent=x.d.error||'Something went wrong. Try again.';off(false);}})
      .catch(function(){m.textContent='Network error. Try again.';off(false);});
    }
    bs.forEach(function(b){b.addEventListener('click',function(){go(b.getAttribute('data-c'));});});
  });
})();
</script>`;

const FOOT = `TradeMind, ${ADDRESS}. Educational research, not personalized investment advice. Investing involves risk, including loss.`;

function header(): string {
    return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="${F}font-size:18px;font-weight:800;color:${C.fg};"><a href="/" style="color:${C.fg};text-decoration:none;">TradeMind<span style="color:${C.blue};">.bot</span></a></td><td align="right">${pill('Free research', C.blue, C.card)}</td></tr></table>`) + sp(18);
}

function shell(title: string, description: string, inner: string): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><style>body{margin:0;background:${C.bg};-webkit-text-size-adjust:100%}a{word-break:break-word}button:disabled{cursor:default}</style></head><body style="margin:0;padding:0;background:${C.bg};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:24px 12px 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">${inner}</table></td></tr></table>${SCRIPT}</body></html>`;
}

function footer(): string {
    return row(`<div style="border-top:1px solid ${C.line};padding-top:14px;${F}font-size:11px;line-height:1.6;color:${C.muted};">Every email we send has an unsubscribe link.<br>${esc(FOOT)}</div>`);
}

/** The weekly issue page: the same layout as the first invitation email, with the two subscribe buttons. */
export function currentIssueHtml(facts: IssueFacts, token: string, strategyMember = false): string {
    const o = { facts, strategyMember, token, firstName: null, baseUrl: BASE_URL, mailingAddress: ADDRESS, step: 1, n: 1 } as unknown as Seq7Opts;
    const url = (k: string) => link(k);
    const f = FOCUS[1];
    const tiles = ([['pl', 'Plans and pricing'], ['f', 'Study program'], ['va', 'Virtual accounts'], ['h', 'trademind.bot']] as [string, string][]);
    const tileRows: string[] = [];
    for (let i = 0; i < tiles.length; i += 2) {
        tileRows.push(`<tr>${tiles.slice(i, i + 2).map(([k, l]) => `<td width="50%" style="padding:4px;">${btn(url(k), l, 'outline', true)}</td>`).join('')}</tr>`);
    }
    const focusCard = card(`${pill('\u{1F4EC} ' + f.pill)}<div style="height:10px;"></div><div style="${F}font-size:20px;font-weight:800;color:${C.fg};line-height:1.3;padding-bottom:10px;">${esc(f.title)}</div>${f.body.map((b) => P(b)).join('')}${why(f.why)}${f.example ? example(f.example) : ''}`, C.green);
    const inner = [
        header(),
        row(`<div style="${F}font-size:26px;font-weight:800;line-height:1.25;color:${C.fg};">${esc(THEME.split('.')[0])}. <span style="color:${C.blue};">${esc(THEME.split('.').slice(1).join('.').trim())}</span></div><div style="${F}font-size:13px;color:${C.muted};padding-top:6px;">${esc(THEME_SUB)}</div>`) + sp(20),
        row(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};padding:4px 4px 8px;">Explore</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tileRows.join('')}</table>`) + sp(14),
        focusCard,
        subscribeBlock(token),
        weeklyIssue(o, (k) => url(k), true),
        subscribeBlock(token, 'Get the next one in your inbox'),
        row(P(DISCOUNT + ' ' + NOBROKER, 13, C.muted)),
        row(P('Write to me at eric@trademind.bot.', 14, C.body)),
        row(`<p style="margin:0 0 2px;${F}font-size:15px;color:${C.fg};font-weight:700;">Eric Huang</p><p style="margin:0 0 20px;${F}font-size:13px;color:${C.muted};">Founder, TradeMind &middot; Queens, New York</p>`),
        footer(),
    ].join('');
    return shell(`Flight Plan: ${facts.weekLabel.toLowerCase()} | TradeMind`, 'A free weekly QQQ brief, risk first: market weather, copilot readout, flight plan and turbulence test.', inner);
}

/** The daily page when no approved daily edition exists yet. */
export function dailyEmptyHtml(token: string): string {
    const inner = [
        header(),
        card(`${pill('Daily brief')}<div style="height:10px;"></div><div style="${F}font-size:22px;font-weight:800;color:${C.fg};line-height:1.3;padding-bottom:10px;">The daily brief is not published yet</div>${P('The daily brief will appear here on market days once it is published. Until then, the weekly issue has the full read.')}${btn('/newsletter/current', 'Read this week\u2019s issue')}`, C.green),
        subscribeBlock(token, 'Get the daily brief in your inbox'),
        footer(),
    ].join('');
    return shell('Daily brief | TradeMind', 'The TradeMind daily brief.', inner);
}

/** Wraps an already rendered edition email (the dark email layout) as a web page, and adds the subscribe buttons. */
export function editionPageHtml(emailHtml: string, subject: string, token: string, kind: 'weekly' | 'daily'): string {
    let h = emailHtml;
    h = h.replace(/You are getting this because you subscribed to the free TradeMind (weekly|daily) brief\.[\s\S]*?Preferences<\/a>/, `You are reading the free TradeMind ${kind} brief. Every email we send has an unsubscribe link.`);
    const block = subscribeBlock(token, 'Get it in your inbox');
    h = h.replace('</table></td></tr></table></body></html>', `${block}</table></td></tr></table>${SCRIPT}</body></html>`);
    return h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(subject)} | TradeMind</title>`);
}
