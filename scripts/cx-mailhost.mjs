#!/usr/bin/env node
// Classifies who hosts each adviser contact's mailbox (google, microsoft, other, unknown) from DNS and saves it on cx_profile.
// usage: DATABASE_URL=... node scripts/cx-mailhost.mjs [all]     default: only contacts not yet classified
// Order of evidence: MX host, then SPF includes, then the autodiscover record, for firms whose MX is a security filter.
import pg from 'pg';
const all = process.argv[2] === 'all';
const refine = process.argv[2] === 'refine';   // re-check only domains currently marked other or unknown
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const doh = async (name, type) => {
    for (const base of ['https://dns.google/resolve', 'https://cloudflare-dns.com/dns-query']) {
        try {
            const r = await fetch(`${base}?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(8000) });
            if (!r.ok) continue;
            const j = await r.json();
            if (j.Status === 3) return { ok: true, data: [] };
            if (j.Status === 0) return { ok: true, data: (j.Answer || []).filter((a) => String(a.type) === String({ MX: 15, TXT: 16, CNAME: 5 }[type])).map((a) => String(a.data).replace(/^"|"$/g, '').toLowerCase()) };
        } catch { /* try next resolver */ }
    }
    return { ok: false, data: [] };
};
const isG = (s) => /google\.com|googlemail\.com/.test(s), isM = (s) => /protection\.outlook\.com|mail\.protection|outlook\.com|office365|microsoft/.test(s);
async function classify(d) {
    const mx = await doh(d, 'MX');
    if (!mx.ok) return ['unknown', 'dns_error'];
    const hosts = mx.data.join(' ');
    if (isG(hosts)) return ['google', 'mx'];
    if (isM(hosts)) return ['microsoft', 'mx'];
    if (!mx.data.length) return ['unknown', 'no_mx'];
    const txt = await doh(d, 'TXT'); const spf = txt.data.filter((t) => t.startsWith('v=spf1')).join(' ');
    const g = /_spf\.google\.com|include:google/.test(spf), m = /spf\.protection\.outlook\.com/.test(spf);
    if (m && !g) return ['microsoft', 'spf'];
    if (g && !m) return ['google', 'spf'];
    const ad = await doh(`autodiscover.${d}`, 'CNAME');
    if (ad.data.some((x) => /outlook\.com|office365|microsoft/.test(x))) return ['microsoft', 'autodiscover'];
    const hint = await extraHints(d, txt.data);
    return hint || ['other', 'mx_other'];
}
// Further Microsoft 365 evidence for firms behind a mail filter: DKIM selectors that point at onmicrosoft.com, Microsoft domain proof records, Lync and device registration records.
async function extraHints(d, txtAll) {
    if (txtAll.some((t) => /^ms=ms\d+/.test(t))) return ['microsoft', 'ms_verify'];
    if (txtAll.some((t) => /^v=spf1/.test(t) && /spf\.protection\.outlook\.com/.test(t))) return ['microsoft', 'spf'];
    for (const sel of ['selector1', 'selector2']) {
        const r = await doh(`${sel}._domainkey.${d}`, 'CNAME');
        if (r.data.some((x) => /onmicrosoft\.com|outlook\.com/.test(x))) return ['microsoft', 'dkim'];
    }
    for (const h of ['lyncdiscover', 'sip', 'enterpriseregistration', 'msoid']) {
        const r = await doh(`${h}.${d}`, 'CNAME');
        if (r.data.some((x) => /lync\.com|office\.com|microsoftonline|windows\.net|outlook\.com|office365/.test(x))) return ['microsoft', 'ms_cname'];
    }
    const g = await doh(`google._domainkey.${d}`, 'TXT');
    if (g.data.some((x) => /v=dkim1/.test(x))) return ['google', 'dkim'];
    return null;
}
const rows = (await pool.query(`SELECT DISTINCT split_part(c.email,'@',2) AS d FROM outreach_contacts c JOIN cx_profile p ON p.token=c.token WHERE c.wave='cx' ${all ? '' : refine ? "AND p.mail_host IN ('other','unknown')" : 'AND p.mail_host IS NULL'}`)).rows.map((r) => r.d.toLowerCase());
console.log('domains', rows.length);
const out = new Map(); let i = 0;
await Promise.all(Array.from({ length: 12 }, async () => { while (i < rows.length) { const d = rows[i++]; out.set(d, await classify(d)); } }));
const doms = [...out.keys()];
for (let k = 0; k < doms.length; k += 300) {
    const part = doms.slice(k, k + 300);
    await pool.query(`UPDATE cx_profile p SET mail_host=u.h, mail_host_via=u.v, mail_host_at=NOW() FROM outreach_contacts c, unnest($1::text[],$2::text[],$3::text[]) AS u(d,h,v) WHERE c.token=p.token AND c.wave='cx' AND lower(split_part(c.email,'@',2))=u.d`, [part, part.map((d) => out.get(d)[0]), part.map((d) => out.get(d)[1])]);
}
const s = (await pool.query(`SELECT mail_host, mail_host_via, count(*)::int n FROM cx_profile WHERE mail_host IS NOT NULL GROUP BY 1,2 ORDER BY 3 DESC`)).rows;
console.table(s); await pool.end();
