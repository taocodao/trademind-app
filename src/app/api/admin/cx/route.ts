import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/admin-gate';
import { query } from '@/lib/db';
import { setSetting } from '@/lib/outreach/db';
import { buildDrafts, renderCx } from '@/lib/outreach/cx-copy';
import { sendRetailPlacementTest, sendRetailSimpleSample } from '@/lib/outreach/seq7-live';
import { MAILING_ADDRESS } from '@/lib/newsletter/email';
import { BASE_URL } from '@/lib/outreach/db';
import { CX_DEFAULTS, cxStatus, ensureCxTables, importCx, parseListFile, sendCxConsulti, sendCxTest, verifyResendDomains } from '@/lib/outreach/cx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const SETTING_KEYS = new Set(CX_DEFAULTS.map(([k]) => k));

async function gate(req: NextRequest) {
    const g = await resolveAdmin(req);
    return g.isAdmin ? null : NextResponse.json({ error: g.error || 'Forbidden' }, { status: g.status });
}

export async function GET(req: NextRequest) {
    const denied = await gate(req); if (denied) return denied;
    await ensureCxTables();
    const email = req.nextUrl.searchParams.get('preview');
    if (email) {
        const c = (await query(`SELECT c.token, c.email, c.status, p.firm, p.title, p.hook_id, p.hold, p.hold_reason, p.keywords FROM outreach_contacts c JOIN cx_profile p ON p.token = c.token WHERE c.email = $1`, [email.trim().toLowerCase()])).rows[0];
        if (!c) return NextResponse.json({ error: 'No outreach contact with that email' }, { status: 404 });
        const d = (await query(`SELECT step, subject, body FROM cx_draft WHERE token = $1 ORDER BY step`, [c.token])).rows;
        const sends = (await query(`SELECT step, domain, sent_at, status FROM outreach_sends WHERE token = $1 AND step BETWEEN 41 AND 48 ORDER BY step`, [c.token])).rows;
        const emails = d.map((x) => ({ step: x.step, subject: x.subject, text: renderCx(x, { token: c.token, linkBase: BASE_URL, unsubUrl: `${BASE_URL}/u/${c.token}`, mailingAddress: MAILING_ADDRESS }).text }));
        return NextResponse.json({ contact: { email: c.email, status: c.status, firm: c.firm, title: c.title, hook: c.hook_id, hold: c.hold, hold_reason: c.hold_reason }, emails, sends });
    }
    return NextResponse.json(await cxStatus());
}

export async function POST(req: NextRequest) {
    const denied = await gate(req); if (denied) return denied;
    await ensureCxTables();
    try {
        const ct = req.headers.get('content-type') || '';
        if (ct.includes('multipart/form-data')) {
            const fd = await req.formData();
            const file = fd.get('file');
            if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a CSV or XLSX file' }, { status: 400 });
            const rows = await parseListFile(file.name, await file.arrayBuffer());
            if (!rows.length) return NextResponse.json({ error: 'The file has no data rows' }, { status: 400 });
            if (!('email' in rows[0])) return NextResponse.json({ error: 'The file needs an email column' }, { status: 400 });
            const name = String(fd.get('name') || file.name).slice(0, 120);
            return NextResponse.json(await importCx(rows, { name, commit: fd.get('commit') === '1' }));
        }
        const b = (await req.json()) as Record<string, unknown>;
        switch (b.action) {
            case 'settings': {
                const v = (b.values ?? {}) as Record<string, string>;
                for (const [k, val] of Object.entries(v)) if (SETTING_KEYS.has(k)) await setSetting(k, String(val).slice(0, 300));
                return NextResponse.json({ ok: true });
            }
            case 'verify_domains': {
                const s = await cxStatus();
                const names = ((s.domains as { domain: string }[]) ?? []).map((d) => d.domain);
                return NextResponse.json({ result: await verifyResendDomains(names) });
            }
            case 'resume_domain': await setSetting(`cx_pause_${String(b.domain).toLowerCase()}`, ''); return NextResponse.json({ ok: true });
            case 'stop': {
                const list = String(b.emails || '').toLowerCase().split(/[\s,;]+/).filter((x) => x.includes('@'));
                const r = await query(`UPDATE outreach_contacts SET status = 'replied', updated_at = NOW() WHERE wave = 'cx' AND email = ANY($1::text[]) AND status NOT IN ('unsubscribed','complained') RETURNING email`, [list]);
                return NextResponse.json({ stopped: r.rowCount });
            }
            case 'retailtest': return NextResponse.json(await sendRetailPlacementTest(String(b.code), String(b.domain), b.mode === 'text' ? 'text' : 'html', Number(b.n) || 1, b.via === 'resend' ? 'resend' : b.via === 'namecheap' ? 'namecheap' : undefined));
            case 'retailgo': {
                // Retail production switch. on: simple one link emails, Gmail and others through Resend, Microsoft through Workspace, all from vochat.ai;
                // the two SendGrid retail domains stop; newsletter emails come from the domain that reached the subscriber. off reverses it.
                const on = b.mode !== 'off';
                const set = async (k: string, v: string) => setSetting(k, v);
                await set('retail_route', on ? 'on' : 'off'); await set('retail_simple', on ? 'on' : 'off'); await set('newsletter_match_domain', on ? 'on' : 'off'); await set('retail_defer_legacy', on ? 'on' : 'off');
                if (on) {
                    await set('pd_start_vochat.ai', String(Number(b.start) || 80)); await set('pd_step_vochat.ai', String(Number(b.step) || 20));
                    await set('pd_cap_vochat.ai', String(Number(b.cap) || 500)); await set('pd_jitter_vochat.ai', '5');
                    await query(`INSERT INTO outreach_domains (domain, from_local, transport, status) VALUES ('vochat.ai','eric','resend','active')
                                 ON CONFLICT (domain) DO UPDATE SET status = 'active', transport = 'resend', paused_reason = NULL`);
                    await query(`UPDATE outreach_domains SET status = 'paused', paused_reason = 'retail moved to vochat.ai with Gmail and Outlook routing', paused_at = NOW() WHERE domain IN ('trademindcopilot.com','aicopliotupdate.com') AND status = 'active'`);
                } else {
                    await query(`UPDATE outreach_domains SET status = 'active', paused_reason = NULL WHERE domain IN ('trademindcopilot.com','aicopliotupdate.com')`);
                    await query(`UPDATE outreach_domains SET status = 'paused', paused_reason = 'retail routing switched off', paused_at = NOW() WHERE domain = 'vochat.ai'`);
                }
                return NextResponse.json({ ok: true, mode: on ? 'on' : 'off', domains: (await query(`SELECT domain, status, transport FROM outreach_domains WHERE status = 'active' ORDER BY domain`)).rows });
            }
            case 'sendreport': {
                const { CX_TEST_ALLOW } = await import('@/lib/outreach/cx');
                const { buildOutreachReport, sendAlert } = await import('@/lib/outreach/sender');
                const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : '';
                if (!date) return NextResponse.json({ error: 'date YYYY-MM-DD required' }, { status: 400 });
                const to = (Array.isArray(b.to) ? b.to : [b.to]).map((x: unknown) => String(x).trim().toLowerCase()).filter(Boolean);
                if (!to.length || to.some((x: string) => !CX_TEST_ALLOW.has(x))) return NextResponse.json({ error: 'not an authorized address' }, { status: 400 });
                const r = await buildOutreachReport(date, b.label ? String(b.label) : 'full day');
                for (const addr of to) await sendAlert(`${r.subject} (resend)`, r.body, addr);
                return NextResponse.json({ ok: true, to, subject: r.subject, chars: r.body.length });
            }
            case 'nlsample': {
                const { CX_TEST_ALLOW } = await import('@/lib/outreach/cx');
                const to = String(b.to).trim().toLowerCase();
                if (!CX_TEST_ALLOW.has(to)) return NextResponse.json({ error: 'not an authorized test address' }, { status: 400 });
                const { sendSubscriberLink, senderForSubscriber, firstNameFor } = await import('@/lib/newsletter/link-send');
                const wave = String(b.wave || 'W2_rollout');
                const ok = await sendSubscriberLink({ email: to, subscriberId: 1068, cadence: 'weekly', sample: { wave } });
                const snd = await senderForSubscriber(to, wave);
                return NextResponse.json({ ok, from: snd.from, transport: snd.transport, host: snd.host, firstName: await firstNameFor(to) });
            }
            case 'retailsimple': return NextResponse.json(await sendRetailSimpleSample({ domain: String(b.domain), to: String(b.to), stage: String(b.stage) as never, n: Number(b.n ?? 1), via: b.via === 'workspace' ? 'workspace' : b.via === 'resend' ? 'resend' : b.via === 'namecheap' ? 'namecheap' : undefined }));
            case 'consulti': return NextResponse.json(await sendCxConsulti(String(b.code), { only: b.only === 'google' || b.only === 'microsoft' ? b.only : undefined, htmlOnly: b.htmlOnly === true, stdId: b.stdId === true, smtp: b.smtp === true }));
            case 'test': return NextResponse.json(await sendCxTest({ domain: String(b.domain), to: String(b.to), email: b.email ? String(b.email) : undefined, steps: Array.isArray(b.steps) ? (b.steps as number[]) : undefined, transport: b.transport === 'workspace' ? 'workspace' : 'resend' }));
            case 'regenerate': {
                // Rebuild drafts for contacts that have not been sent their first email yet (after a copy change).
                const rows = (await query(`SELECT c.token, c.email, c.first_name, p.firm, p.firm_key, p.title, p.website, p.linkedin, p.city, p.state, p.employees, p.keywords FROM outreach_contacts c JOIN cx_profile p ON p.token = c.token WHERE c.wave = 'cx' AND NOT EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step = 41)`)).rows;
                let n = 0;
                const { buildProfile } = await import('@/lib/outreach/cx-copy');
                for (const r of rows) {
                    const p = buildProfile({ email: r.email, first_name: r.first_name, job_title: r.title, company_name: r.firm, company_domain: r.firm_key, website: r.website, keywords: r.keywords, linkedin_url: r.linkedin, city: r.city, state: r.state, employee_count: r.employees });
                    const ds = buildDrafts(p, r.token); const errs = ds.flatMap((d) => d.errors);
                    for (const d of ds) await query(`INSERT INTO cx_draft (token, step, subject, body, words, errors) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (token, step) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body, words = EXCLUDED.words, errors = EXCLUDED.errors`, [r.token, d.step, d.subject, d.body, d.words, d.errors.join(' | ') || null]);
                    await query(`UPDATE cx_profile SET hold = $2, hold_reason = $3, hook_id = $4, hook = $5 WHERE token = $1`, [r.token, errs.length > 0, errs.join(' | ') || null, p.hookId, p.hook]);
                    n++;
                }
                return NextResponse.json({ regenerated: n });
            }
        }
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 400 });
    }
}
