#!/usr/bin/env node
// Isolated test send. Uses the SendGrid API directly. Never touches the production database, queue, contacts or settings.
// Usage: SENDGRID_API_KEY=... node scripts/test-send.mjs --content file.json --to a@b.com [--domain trademindnewsletter.com] [--from-local eric] [--reply-to erichuang2005@gmail.com] [--no-unsub]
// file.json has { subject, text, html }.
import fs from 'node:fs';
const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => { if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const OWNER = /^(web3aistore\d?|testtrademind\w*|erichuang2005|ericyaohuang|eric)(\+[^@]*)?@(gmail\.com|vochat\.ai|vochat\.com|arenza\.tv|trademind\.bot|taocodao\.com)$/i;
if (!a.content || !a.to) { console.error('need --content and --to'); process.exit(1); }
if (!OWNER.test(a.to)) { console.error('recipient is not an owner test address'); process.exit(1); }
// In the sandbox the key is injected by the credential proxy (curl with the literal $SENDGRID_API_KEY placeholder); elsewhere set SENDGRID_API_KEY.
const key = process.env.SENDGRID_API_KEY || '$SENDGRID_API_KEY';
const m = JSON.parse(fs.readFileSync(a.content, 'utf8'));
const domain = a.domain || 'trademindnewsletter.com';
const unsub = (m.html.match(/https:\/\/trademind\.bot\/u\/[A-Za-z0-9]+/) || [])[0];
const payload = {
    personalizations: [{ to: [{ email: a.to }], ...(a['no-unsub'] || !unsub ? {} : { headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }), custom_args: { campaign: 'test-route' } }],
    from: { email: `${a['from-local'] || 'eric'}@${domain}`, name: 'Eric Huang' },
    reply_to: { email: a['reply-to'] || 'erichuang2005@gmail.com' },
    subject: m.subject,
    content: [{ type: 'text/plain', value: m.text }, ...(m.html ? [{ type: 'text/html', value: m.html }] : [])],
    mail_settings: { footer: { enable: false } },
    tracking_settings: { click_tracking: { enable: false, enable_text: false }, open_tracking: { enable: false }, subscription_tracking: { enable: false } },
};
import { execFileSync } from 'node:child_process';
const out = execFileSync('curl', ['-s', '-i', '-X', 'POST', 'https://api.sendgrid.com/v3/mail/send', '-H', `Authorization: Bearer ${key}`, '-H', 'Content-Type: application/json', '-d', JSON.stringify(payload)], { encoding: 'utf8' });
const status = [...out.matchAll(/^HTTP\/[\d.]+ (\d+)/gm)].pop()?.[1];
const id = /x-message-id: (\S+)/i.exec(out)?.[1] || '';
if (process.env.TEST_SEND_DEBUG) console.log(out.slice(0, 500));
console.log(status, id, status === '202' ? 'sent' : out.slice(-300), `from ${payload.from.email} reply-to ${payload.reply_to.email} to ${a.to}`);
