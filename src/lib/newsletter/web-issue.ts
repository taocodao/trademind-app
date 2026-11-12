/**
 * The newsletter on the website. The weekly page uses the same layout and the same live facts as the first
 * invitation email (copy-seq7), so the page and the email a reader may have seen match. The daily page
 * shows the latest approved daily edition. Pure HTML builders: no database access here except the helpers
 * that are passed in.
 */
import {
    C, F, row, sp, card, btn, btnPair, pill, P, esc, why, FOCUS, THEME, THEME_SUB, DISCOUNT, NOBROKER, weeklyIssue,
    MEETING_URL, type Seq7Opts, type IssueFacts, type FlightOverride,
} from '@/lib/outreach/copy-seq7';
import type { NewsletterIssue } from '@/lib/newsletter/issues';

const ADDRESS = process.env.NEWSLETTER_MAILING_ADDRESS || '151-58 24th Rd, Whitestone, NY 11357, United States';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

const PATHS: Record<string, string> = { pl: '/plans', f: '/founding', va: '/live-record?demo=1', v: '/simulated-record', h: '/', i: '/newsletter/current' };
const link = (k: string) => PATHS[k] ?? '/';

const btnStyle = (primary: boolean) =>
    `display:block;width:100%;cursor:pointer;border-radius:10px;padding:${primary ? '14px 18px' : '13px 18px'};font:800 ${primary ? 16 : 15}px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;` +
    (primary ? `background:${C.btn};color:#ffffff;border:1px solid ${C.btn};` : `background:${C.card};color:${C.blue};border:1px solid #3a4a70;`);

/** The two subscribe buttons. With a personal link they are plain links; otherwise an email box and two buttons. */
export function subscribeBlock(token: string, heading = 'Get it in your inbox'): string {
    const head = `<div style="${F}font-size:18px;font-weight:800;color:${C.fg};padding-bottom:4px;">${esc(heading)}</div>${P('Free. One short email a week with the link to the new issue.', 14, C.muted)}`;
    if (token) {
        const u = (k: string) => `${BASE_URL}/r/${token}/${k}?s=1`;
        return card(`${head}${btn(u('sw'), 'Subscribe free')}`, C.btn);
    }
    const form = `<form class="tm-sub" onsubmit="return false" style="margin:0;">
<input class="tm-email" type="email" required placeholder="you@example.com" aria-label="Email address" autocomplete="email" style="display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:13px 14px;border-radius:10px;border:1px solid ${C.line};background:#0b0f17;color:${C.fg};font:500 16px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<input class="tm-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;width:0;">
<button type="button" data-c="weekly" style="${btnStyle(true)}">Subscribe free</button>
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
export function currentIssueHtml(facts: IssueFacts, token: string, strategyMember = false, embed = false): string {
    const o = { facts, strategyMember, token, firstName: null, baseUrl: BASE_URL, mailingAddress: ADDRESS, step: 1, n: 1 } as unknown as Seq7Opts;
    const url = (k: string) => link(k);
    const f = FOCUS[1];
    const tiles = ([['pl', 'Plans and pricing'], ['f', 'Study program'], ['va', 'Virtual accounts'], ['h', 'trademind.bot']] as [string, string][]);
    const tileRows: string[] = [];
    for (let i = 0; i < tiles.length; i += 2) {
        tileRows.push(`<tr>${tiles.slice(i, i + 2).map(([k, l]) => `<td width="50%" style="padding:4px;">${btn(url(k), l, 'outline', true)}</td>`).join('')}</tr>`);
    }
    const focusCard = card(`${pill('\u{1F4EC} ' + f.pill)}<div style="height:10px;"></div><div style="${F}font-size:20px;font-weight:800;color:${C.fg};line-height:1.3;padding-bottom:10px;">${esc(f.title)}</div>${f.body.map((b) => P(b)).join('')}${why(f.why)}`, C.green);
    const inner = [
        ...(embed ? [] : [header()]),
        row(`<div style="${F}font-size:26px;font-weight:800;line-height:1.25;color:${C.fg};">${esc(THEME.split('.')[0])}. <span style="color:${C.blue};">${esc(THEME.split('.').slice(1).join('.').trim())}</span></div><div style="${F}font-size:13px;color:${C.muted};padding-top:6px;">${esc(THEME_SUB)}</div>`) + sp(20),
        row(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};padding:4px 4px 8px;">Explore</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tileRows.join('')}</table>`) + sp(14),
        focusCard,
        ...(embed ? [] : [subscribeBlock(token)]),
        weeklyIssue(o, (k) => url(k), true),
        ...(embed ? [] : [subscribeBlock(token, 'Get the next one in your inbox')]),
        row(P(DISCOUNT + ' ' + NOBROKER, 13, C.muted)),
        ...(embed ? [] : [row(P('Write to me at eric@trademind.bot.', 14, C.body))]),
        ...(embed ? [] : [row(`<p style="margin:0 0 2px;${F}font-size:15px;color:${C.fg};font-weight:700;">Eric Huang</p><p style="margin:0 0 20px;${F}font-size:13px;color:${C.muted};">Founder, TradeMind &middot; Queens, New York</p>`), footer()]),
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


// ---------- Library issue in the new format (retail and adviser copies) ----------

const inline = (t: string) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${C.fg};">$1</strong>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, a, u) => `<a href="${u}" style="color:${C.blue};text-decoration:underline;">${a}</a>`);

/** The issue body (markdown subset: paragraphs, ## headings, - lists, bold, links) as dark card content. */
export function issueBodyHtml(md: string): string {
    const out: string[] = []; let list: string[] = [];
    const flush = () => { if (list.length) { out.push(`<ul style="margin:0 0 14px;padding-left:20px;${F}font-size:15px;line-height:1.65;color:${C.body};">${list.map((x) => `<li style="margin:0 0 6px;">${inline(x)}</li>`).join('')}</ul>`); list = []; } };
    for (const blk of md.trim().split(/\n\s*\n/)) {
        const lines = blk.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) continue;
        if (lines.every((l) => l.startsWith('- '))) { lines.forEach((l) => list.push(l.slice(2))); flush(); continue; }
        flush();
        if (lines[0].startsWith('## ')) { out.push(`<div style="margin:18px 0 8px;${F}font-size:16px;font-weight:800;color:${C.fg};">${esc(lines[0].slice(3))}</div>`); const rest = lines.slice(1).join(' '); if (rest) out.push(`<p style="margin:0 0 12px;${F}font-size:15px;line-height:1.65;color:${C.body};">${inline(rest)}</p>`); continue; }
        out.push(`<p style="margin:0 0 12px;${F}font-size:15px;line-height:1.65;color:${C.body};">${inline(lines.join(' '))}</p>`);
    }
    flush();
    return out.join('');
}

const SHARE_CSS = `
*{box-sizing:border-box}
body{margin:0;background:${C.bg};color:${C.body};-webkit-text-size-adjust:100%;${F}}
a{word-break:break-word}
.lw{max-width:900px;margin:0 auto;padding:22px 16px 48px}
.brand{text-align:center;margin:0 0 10px}
.brand a{display:inline-block;position:relative;padding-bottom:9px;font-family:Georgia,'Times New Roman',serif;font-weight:600;letter-spacing:-.01em;font-size:clamp(1.3rem,.8rem + 1.9vw,1.9rem);text-decoration:none;color:#A78BFA;background:linear-gradient(92deg,#A78BFA 0%,#e0a458 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:tm-fade-up 400ms cubic-bezier(.16,1,.3,1) both}
.brand a::after{content:'';position:absolute;left:6%;right:6%;bottom:0;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(167,139,250,0),#A78BFA 25%,#e0a458 75%,rgba(224,164,88,0))}
.top{position:relative}
.auth{position:absolute;right:0;top:0;font-size:13px}
.auth a.lg{display:inline-block;color:#d5dae3;border:1px solid #3a4a70;background:#121826;border-radius:999px;padding:7px 16px;font-weight:700;text-decoration:none}
.auth a.lg:hover{border-color:#8B5CF6}
.auth .em{display:inline-block;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9aa4b5;border:1px solid ${C.line};background:#121826;border-radius:999px;padding:7px 14px}
@media (max-width:640px){.auth{position:static;text-align:center;margin:2px 0 6px}}
.crumbs{display:flex;flex-wrap:wrap;gap:4px 14px;justify-content:space-between;align-items:baseline;font-size:13px;color:${C.muted};margin:16px 0 22px}
.crumbs a{color:#a78bfa;text-decoration:none}
.crumbs b{color:${C.green};letter-spacing:.1em;text-transform:uppercase;font-size:11px}
h1.ttl{margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-weight:300;font-size:clamp(21px,2.4vw,28px);line-height:1.2;letter-spacing:-.01em;color:#fff}
.tm-wmask{display:inline-block;overflow:hidden;padding-bottom:.12em;margin-bottom:-.12em}
.tm-w{display:inline-block;animation:tm-w-in 750ms cubic-bezier(.16,1,.3,1) both}
.tm-l{display:inline-block;transition:color 300ms ease-in-out,filter 300ms ease-in-out,text-shadow 300ms ease-in-out}
.tm-l.tm-lit{color:#a78bfa;filter:brightness(1.35);text-shadow:0 0 22px rgba(139,92,246,1),0 0 10px rgba(139,92,246,.9)}
@keyframes tm-w-in{from{opacity:0;clip-path:inset(0 0 100% 0);transform:translateY(.4em)}55%{opacity:1}to{opacity:1;clip-path:inset(0 0 -.15em 0);transform:translateY(0)}}
@keyframes tm-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 26px}
@media (min-width:700px){.tiles{grid-template-columns:repeat(4,minmax(0,1fr))}}
.tiles a{display:block;text-align:center;font:700 14px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#7aa2ff;background:#121826;border:1px solid #3a4a70;border-radius:10px;padding:13px 10px;text-decoration:none}
.tiles a:hover{border-color:#8B5CF6}
.grid{display:block}
.rail{display:none}
.mshare{display:block}
@media (min-width:900px){
 .grid{display:grid;grid-template-columns:140px minmax(0,680px);gap:32px;align-items:start}
 .rail{display:flex;flex-direction:column;gap:10px;position:sticky;top:24px}
 .mshare{display:none}
}
.rail a,.rail button{display:block;width:100%;text-align:center;cursor:pointer;font:700 13px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#d5dae3;background:#121826;border:1px solid ${C.line};border-radius:10px;padding:13px 10px;text-decoration:none}
.rail .pri{background:#8B5CF6;border-color:#8B5CF6;color:#fff}
.rail .more{display:none;flex-direction:column;gap:10px}
.rail .more.on{display:flex}
.rail a:hover,.rail button:hover{border-color:#8B5CF6}
.col{max-width:680px;width:100%}
@media (prefers-reduced-motion:reduce){.tm-w,.brand a{animation:none}}
`;

const TITLE_SCRIPT = `<script>
(function(){
  var h=document.querySelector('h1.ttl');
  if(h&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    var ts=[];
    function run(){h.querySelectorAll('.tm-l').forEach(function(l,i){ts.push(setTimeout(function(){l.classList.add('tm-lit');ts.push(setTimeout(function(){l.classList.remove('tm-lit');},1000));},i*120));});}
    setTimeout(run,2200);setInterval(run,20000);
  }
  document.querySelectorAll('[data-copy]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var t=a.getAttribute('data-copy'),o=a.textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){a.textContent='Copied';setTimeout(function(){a.textContent=o;},1500);},function(){a.textContent='Copy failed';});});});
  document.querySelectorAll('[data-share]').forEach(function(b){b.addEventListener('click',function(){var u=b.getAttribute('data-share'),t=b.getAttribute('data-title');if(navigator.share){navigator.share({title:t,url:u}).catch(function(){});}else if(navigator.clipboard){navigator.clipboard.writeText(u);var o=b.textContent;b.textContent='Link copied';setTimeout(function(){b.textContent=o;},1500);}});});
  document.querySelectorAll('[data-more]').forEach(function(b){b.addEventListener('click',function(){var m=document.getElementById(b.getAttribute('data-more'));m.classList.toggle('on');b.textContent=m.classList.contains('on')?'Less':'More';});});
})();
</script>`;

function words(text: string): string {
    return text.split(/\s+/).filter(Boolean).map((w, i) => `<span class="tm-wmask"><span class="tm-w" style="animation-delay:${140 + i * 90}ms">${Array.from(w).map((c) => `<span class="tm-l">${esc(c)}</span>`).join('')}</span></span>`).join(' ');
}

function shareLinks(issue: NewsletterIssue, path: string) {
    const base = `${BASE_URL}${path}`;
    const u = (src: string) => `${base}?utm_medium=share&utm_campaign=${encodeURIComponent(issue.slug)}&utm_source=${src}`;
    const enc = encodeURIComponent; const text = `${issue.title} - The AI Systematic Investor by TradeMind`;
    return {
        native: u('native'), copy: u('copy_link'),
        email: `mailto:?subject=${enc(text)}&body=${enc(issue.excerpt + '\n\n' + u('email'))}`,
        x: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(u('x'))}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u('linkedin'))}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(u('facebook'))}`,
        bluesky: `https://bsky.app/intent/compose?text=${enc(text + ' ' + u('bluesky'))}`,
        reddit: `https://www.reddit.com/submit?url=${enc(u('reddit'))}&title=${enc(issue.title)}`,
        title: text,
    };
}

function shareRail(issue: NewsletterIssue, path: string): string {
    const s = shareLinks(issue, path);
    const a = (h: string, l: string) => `<a href="${esc(h)}" target="_blank" rel="noopener">${l}</a>`;
    return `<aside class="rail" aria-label="Share this issue"><button type="button" class="pri" data-share="${esc(s.native)}" data-title="${esc(s.title)}">Share</button><a href="#" data-copy="${esc(s.copy)}">Copy link</a>${a(s.email, 'Email')}${a(s.x, 'X')}${a(s.linkedin, 'LinkedIn')}${a(s.facebook, 'Facebook')}<div class="more" id="more-share">${a(s.bluesky, 'Bluesky')}${a(s.reddit, 'Reddit')}</div><button type="button" data-more="more-share">More</button></aside>`;
}

/** Share card shown on small screens, where the left rail is hidden. */
function shareCard(issue: NewsletterIssue, path: string): string {
    const s = shareLinks(issue, path);
    const chip = `display:inline-block;${F}font-size:13px;font-weight:700;color:${C.blue};border:1px solid #3a4a70;border-radius:8px;padding:8px 12px;background:${C.card};text-decoration:none;`;
    const links: [string, string][] = [['LinkedIn', s.linkedin], ['X', s.x], ['Facebook', s.facebook], ['Bluesky', s.bluesky], ['Reddit', s.reddit], ['Email', s.email]];
    return `<div class="mshare">${card(`<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};padding-bottom:6px;">Share this issue</div>${P('Know someone who would use a process before the next prediction? Send them this issue. Anyone can subscribe free.', 14, C.body)}<div style="line-height:2.4;">${links.map(([l, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener" style="${chip}">${l}</a>`).join(' ')} <a href="#" data-copy="${esc(s.copy)}" style="${chip}">Copy link</a></div>`)}</div>`;
}

/** Weekly only subscribe card for the library issue pages (the daily option is retired). */
function weeklySubscribe(token: string): string {
    const head = `<div id="subscribe" style="${F}font-size:18px;font-weight:800;color:${C.fg};padding-bottom:4px;">Get the next issue in your inbox</div>${P('Free. Weekly. You get one short email with the link to the issue.', 14, C.muted)}`;
    if (token) return card(`${head}${btn(`${BASE_URL}/r/${token}/sw?s=1`, 'Subscribe free')}`, C.btn);
    const form = `<form class="tm-sub" onsubmit="return false" style="margin:0;"><input class="tm-email" type="email" required placeholder="you@example.com" aria-label="Email address" autocomplete="email" style="display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:13px 14px;border-radius:10px;border:1px solid ${C.line};background:${C.bg};color:${C.fg};font-size:16px;"><input class="tm-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;width:0;"><button type="button" data-c="weekly" style="${btnStyle(true)}">Subscribe free</button><p class="tm-msg" role="status" style="margin:10px 0 0;${F}font-size:13px;color:${C.amber};"></p><p style="margin:10px 0 0;${F}font-size:12px;line-height:1.5;color:${C.muted};">By subscribing you agree to receive The AI Systematic Investor and TradeMind offers. Unsubscribe any time.</p></form>`;
    return card(`${head}${form}`, C.btn);
}

const SAMPLE_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SAMPLE_CSS = `.intro{margin:0 0 22px}.intro .sbtn{display:inline-block;cursor:pointer;border:1px solid ${C.btn};background:${C.btn};color:#fff;border-radius:10px;padding:13px 22px;font:800 16px/1.2 ${SAMPLE_FONT}}.intro h2{margin:22px 0 8px;font:800 26px/1.2 ${SAMPLE_FONT};color:${C.fg}}.intro p{margin:0;max-width:760px;font:400 16px/1.65 ${SAMPLE_FONT};color:${C.body}}.acards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px}.acards a{display:block;border:1px solid ${C.line};background:${C.card};border-radius:14px;padding:16px;text-decoration:none;font-family:${SAMPLE_FONT}}.acards b{display:block;color:${C.fg};font-size:16px;font-weight:600;margin-bottom:8px}.acards span{display:block;color:${C.muted};font-size:13px;line-height:1.5;margin-bottom:10px}.acards u{color:#a78bfa;font-size:13px;text-decoration:none}@media(max-width:760px){.acards{grid-template-columns:1fr 1fr}}.mdl{position:fixed;inset:0;z-index:50;display:none;align-items:flex-start;justify-content:center;background:rgba(5,8,14,.78);overflow:auto;padding:24px 12px}.mdl.on{display:flex}.mdl .box{position:relative;width:100%;max-width:620px;background:${C.card};border:1px solid ${C.line};border-radius:16px;padding:26px 24px;margin:auto;font-family:${SAMPLE_FONT};color:${C.body}}.mdl h3{margin:0 0 10px;font-size:22px;line-height:1.25;color:${C.fg}}.mdl h4{margin:18px 0 6px;font-size:16px;color:${C.fg}}.mdl p{margin:0 0 10px;font-size:15px;line-height:1.65}.mdl ul{margin:0 0 10px;padding-left:20px;font-size:15px;line-height:1.7}.mdl a{color:${C.blue}}.mdl .x{position:absolute;top:10px;right:12px;border:0;background:none;color:${C.muted};font-size:26px;line-height:1;cursor:pointer}`;

const ENGAGE_SCRIPT = `<script>
(function(){
  var t0=Date.now(),vis=0,last=document.visibilityState==='visible'?Date.now():0,sent=false,tok=new URLSearchParams(location.search).get('t')||'';
  if(/^[A-Za-z0-9_-]{10,11}$/.test(tok)){
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')last=Date.now();else if(last){vis+=Date.now()-last;last=0;}});
    var iv=setInterval(function(){var tot=vis+(last?Date.now()-last:0);if(!sent&&tot>=3000){sent=true;fetch('/api/engage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:tok,page:location.pathname}),keepalive:true});clearInterval(iv);}},500);
    var done=false;['scroll','pointerdown','keydown','touchstart','wheel'].forEach(function(n){window.addEventListener(n,function(e){if(done||!e.isTrusted)return;done=true;setTimeout(function(){fetch('/api/engage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:tok,interacted:true}),keepalive:true});},Math.max(0,3800-(Date.now()-t0)));},{passive:true});});
  }
})();
</script>`;

const SAMPLE_SCRIPT = `<script>
(function(){
  var m=document.getElementById('tm-mdl');if(!m)return;
  function open(){m.classList.add('on');document.body.style.overflow='hidden';}
  function close(){m.classList.remove('on');document.body.style.overflow='';}
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('a,button[data-share],button[data-more],[data-open]');
    if(!t)return;
    if(t.closest('.mdl')){ if(t.hasAttribute('data-close'))close(); return; }
    if(t.hasAttribute('data-free'))return;
    e.preventDefault();e.stopPropagation();open();
  },true);
  m.addEventListener('click',function(e){if(e.target===m)close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
})();
</script>`;

/** Top of the adviser sample page: subscribe button, then the problem and the approach. Every link on the page opens the subscribe popup. */
function sampleIntro(): string {
    const cards: [string, string][] = [
        ['Market Regime', 'Which environment are we actually in, measured instead of guessed.'],
        ['ML Insight', 'A model that ranks setups and can veto a trade, but never starts one.'],
        ['Options Structure', 'LEAPS, covered calls, and put sleeves with the trade-offs stated up front.'],
        ['Risk Control', 'Drawdown limits and exposure caps that apply on the worst day, not just the good ones.'],
    ];
    return `<section class="intro"><button type="button" class="sbtn" data-open>Subscribe free</button>
<h2>The problem</h2><p>Most retail investors sit in one of two traps. Either they hold passive exposure with no way to adjust risk when conditions change, or they make concentrated bets based on unreliable sources, with no written rules for when to enter, how much to risk, or when to exit. Both approaches fail at the same moment: the day the market stops cooperating.</p>
<h2>The approach</h2><div class="acards">${cards.map(([t, d]) => `<a href="/newsletter/start-here"><b>${esc(t)}</b><span>${esc(d)}</span><u>Read the guide</u></a>`).join('')}</div></section>`;
}

/** The subscribe popup shown for every link on the sample page. */
function sampleModal(token: string): string {
    const sub = weeklySubscribe(token).replace('<a ', '<a data-free ').replace(' id="subscribe"', '');
    return `<div class="mdl" id="tm-mdl" role="dialog" aria-modal="true" aria-label="Subscribe"><div class="box"><button type="button" class="x" data-close aria-label="Close">&times;</button>
<h3>Why most investors need a process</h3>
<p>Many retail investors fall into one of two extremes. They either stay fully passive without a framework for adapting risk, or they make concentrated bets based on headlines, social commentary, and disconnected opinions. The problem is not lack of information. It is lack of structure.</p>
<h4>The real gap</h4>
<p>Most investors do not need more market noise. They need a repeatable process for deciding what matters, what does not, how much risk to take, and when to reduce exposure. A process does not guarantee returns, but it makes decisions more consistent and easier to evaluate.</p>
<h4>What a systematic approach changes</h4>
<ul><li>It replaces impulsive reactions with predefined rules.</li><li>It distinguishes evidence from narrative.</li><li>It forces risk to be considered before expected return.</li><li>It makes outcomes easier to audit and improve over time.</li></ul>
<p>Go deeper: <a href="https://trademind.bot/newsletter/start-here">Systematic Investing Framework</a></p>
${sub}</div></div>`;
}

/**
 * One library issue in the new format, shown as the current issue when it is the latest. Flight plan (the issue
 * text) comes first; market weather, copilot readout and turbulence test are this week's live reading. The same
 * page serves both audiences; the adviser copy adds a card to book 20 minutes.
 */
export function libraryIssueHtml(issue: NewsletterIssue, facts: IssueFacts, o: { token: string; audience: 'retail' | 'adviser'; path: string; isCurrent: boolean; email?: string; last?: { title: string; path: string } | null; sample?: boolean; head?: string }): string {
    const so = { facts, strategyMember: false, token: o.token, firstName: null, baseUrl: BASE_URL, mailingAddress: ADDRESS, step: 1, n: 1 } as unknown as Seq7Opts;
    const d = new Date(`${issue.publishDate}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    const deep = issue.deepLinks.map((l) => `<a href="${esc(l.href)}" style="color:${C.blue};text-decoration:underline;font-weight:600;">${esc(l.label)} &rsaquo;</a>`).join('&nbsp;&nbsp;');
    const ov: FlightOverride = {
        kicker: '', title: '', sub: '', flightFirst: true, noHead: true,
        flightTitle: "This issue\u2019s flight plan",
        flightHtml: issueBodyHtml(issue.body) + (deep ? `<div style="${F}font-size:14px;padding:2px 0 6px;color:${C.muted};">Go deeper: ${deep}</div>` : ''),
    };
    const em = o.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email) ? o.email.trim() : '';
    const plansPath = em ? `/plans?email=${encodeURIComponent(em)}` : '/plans';
    const meet = o.audience === 'adviser'
        ? card(`<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.green};padding-bottom:6px;">For advisers</div>${P('Want to talk it through? Book 20 minutes. We look at one issue together, the record and its limits, and whether it fits your process.', 14, C.body)}${btn(MEETING_URL, 'Book 20 minutes')}`)
        : '';
    const tiles: [string, string][] = [[plansPath, 'Plans and pricing'], ['/founding', 'Study program'], ['/live-record?demo=1', 'Virtual accounts'], ['/', 'trademind.bot']];
    const last = o.last
        ? row(`<div style="${F}font-size:14px;padding:6px 4px 14px;color:${C.muted};">Last issue: <a href="${esc(o.last.path)}" style="color:${C.blue};text-decoration:underline;font-weight:600;">${esc(o.last.title)} &rsaquo;</a></div>`)
        : '';
    const tbl = (x: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${x}</table>`;
    const content = tbl([
        weeklyIssue(so, () => '/', true, ov),
        card(`<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};padding-bottom:6px;">Subscriber offer</div><div style="${F}font-size:17px;font-weight:800;color:${C.fg};padding-bottom:6px;">${esc(DISCOUNT)}</div>${P(NOBROKER, 14, C.muted)}${btn(`${BASE_URL}${plansPath}`, 'See the plans')}`),
        meet,
        em
            ? card(`<div style="${F}font-size:15px;font-weight:800;color:${C.fg};padding-bottom:4px;">You are on the free weekly list</div>${P(`The next issue arrives in your inbox. Unsubscribe any time from the link in each email.`, 14, C.muted)}`)
            : (o.sample ? weeklySubscribe(o.token).replace('<a ', '<a data-free ') : weeklySubscribe(o.token)),
        last,
        row(`<p style="margin:0 0 2px;${F}font-size:15px;color:${C.fg};font-weight:700;">Eric Huang</p><p style="margin:0 0 20px;${F}font-size:13px;color:${C.muted};">Founder, TradeMind &middot; Queens, New York &middot; <a href="mailto:eric@trademind.bot" style="color:${C.blue};">eric@trademind.bot</a></p>`),
        footer(),
    ].join(''));
    const auth = em ? '' : `<a class="lg" href="${BASE_URL}/signin">Log in</a>`;
    const body = `<div class="lw">
<div class="top"><div class="auth">${auth}</div><div class="brand"><a href="/">AI Investor Copilot</a></div></div>
<nav class="crumbs"><span><a href="/">TradeMind home</a> &rsaquo; <a href="/newsletter">Newsletter</a> &rsaquo; <a href="/newsletter/issues">All issues</a> &rsaquo; Issue ${issue.number} &middot; <b>${o.isCurrent ? 'Current issue' : 'Past issue'}</b> &middot; ${esc(d)} &middot; ${esc(issue.readTime)}</span></nav>
<h1 class="ttl" aria-label="${esc(issue.title)}"><span aria-hidden="true">${words(issue.title)}</span></h1>
${o.sample ? sampleIntro() : ''}<nav class="tiles" aria-label="Explore">${tiles.map(([h, l]) => `<a href="${esc(h)}">${esc(l)}</a>`).join('')}</nav>
<div class="grid">${shareRail(issue, o.path)}<div class="col">${content}${shareCard(issue, o.path)}</div></div>
</div>${o.sample ? sampleModal(o.token) : ''}`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(issue.title)} | TradeMind</title><meta name="description" content="${esc(issue.excerpt)}">${o.head ?? ''}<style>${SHARE_CSS}${o.sample ? SAMPLE_CSS : ''}</style></head><body>${body}${SCRIPT}${TITLE_SCRIPT}${o.sample ? SAMPLE_SCRIPT : ''}${ENGAGE_SCRIPT}</body></html>`;
}
