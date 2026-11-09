'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

type Dom = { domain: string; verified: boolean; paused: string | null; budget: number; sentToday: number; sent14: number; bounced14: number; complaints14: number };
type Status = {
    settings: Record<string, string>; contacts: { status: string; n: number }[]; held: number; today: { step: number; n: number }[];
    batches: { id: number; name: string; created_at: string; total: number; imported: number }[];
    steps: { step: number; sent: number; delivered: number; bounced: number; complaints: number }[];
    hooks: { hook_id: string; n: number }[]; domains: Dom[]; now_et: string; resend_key: boolean;
};
type Summary = { rows: number; accepted: number; imported: number; held: number; skipped: Record<string, number>; hooks: Record<string, number>; committed: boolean; sample: { email: string; firm: string; hook: string; subject: string; body: string }[] };

const box = 'rounded-xl border border-white/10 bg-white/5 p-5';
const btn = 'rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40';
const btn2 = 'rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/80 disabled:opacity-40';
const inp = 'rounded-md border border-white/20 bg-black/30 px-2 py-1 text-sm';

export default function CxOutreach() {
    const [st, setSt] = useState<Status | null>(null);
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [sum, setSum] = useState<Summary | null>(null);
    const [vals, setVals] = useState<Record<string, string>>({});
    const [stopList, setStopList] = useState('');
    const [prevEmail, setPrevEmail] = useState('');
    const [prev, setPrev] = useState<{ contact: Record<string, unknown>; emails: { step: number; subject: string; text: string }[]; sends: { step: number; domain: string; status: string }[] } | null>(null);
    const [testTo, setTestTo] = useState('testtrademind@gmail.com');
    const [testDom, setTestDom] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        const r = await adminFetch('/api/admin/cx');
        if (r.ok) { const d = (await r.json()) as Status; setSt(d); setVals((v) => (Object.keys(v).length ? v : d.settings)); setTestDom((x) => x || d.domains.find((y) => y.verified)?.domain || ''); }
    }, []);
    useEffect(() => { void load(); }, [load]);

    async function post(body: Record<string, unknown>) {
        setBusy(true); setMsg('');
        try {
            const r = await adminFetch('/api/admin/cx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const j = await r.json(); setMsg(r.ok ? JSON.stringify(j) : String(j.error || 'Failed')); await load(); return j;
        } finally { setBusy(false); }
    }
    async function upload(commit: boolean) {
        if (!file) return;
        setBusy(true); setMsg(''); setSum(null);
        try {
            const fd = new FormData(); fd.append('file', file); fd.append('commit', commit ? '1' : '0'); fd.append('name', name || file.name);
            const r = await adminFetch('/api/admin/cx', { method: 'POST', body: fd });
            const j = await r.json();
            if (!r.ok) setMsg(String(j.error || 'Import failed')); else { setSum(j as Summary); if (commit) { setFile(null); if (fileRef.current) fileRef.current.value = ''; await load(); } }
        } finally { setBusy(false); }
    }
    async function preview() {
        setPrev(null); setMsg('');
        const r = await adminFetch(`/api/admin/cx?preview=${encodeURIComponent(prevEmail)}`);
        const j = await r.json(); if (r.ok) setPrev(j); else setMsg(String(j.error));
    }

    if (!st) return null;
    const enabled = st.settings.cx_enabled === 'true';
    const total = st.contacts.reduce((a, c) => a + c.n, 0);
    const field = (k: string, label: string, w = 'w-24') => (
        <label className="text-xs text-white/60">{label}<br /><input className={`${inp} ${w}`} value={vals[k] ?? ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></label>
    );

    return (
        <section className={`mt-8 ${box}`}>
            <h2 className="text-lg font-semibold">Adviser outreach (Consulti list)</h2>
            <p className="mt-1 text-sm text-white/60">Imports the Consulti export, writes four custom emails per contact, and sends them on business days from the domains below. Now {st.now_et} Eastern.</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{enabled ? 'Sending is ON' : 'Sending is OFF'}</span>
                <button className={btn} disabled={busy} onClick={() => post({ action: 'settings', values: { cx_enabled: enabled ? 'false' : 'true' } })}>{enabled ? 'Pause sending' : 'Start sending'}</button>
                <span className="text-sm text-white/60">{total} contacts, {st.held} held for review{st.resend_key ? '' : ', Resend key missing'}</span>
            </div>

            <h3 className="mt-6 font-medium">1. Import the contact list</h3>
            <div className="mt-2 flex flex-wrap items-end gap-3">
                <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setSum(null); }} className="text-sm" />
                <input className={`${inp} w-56`} placeholder="Batch name" value={name} onChange={(e) => setName(e.target.value)} />
                <button className={btn2} disabled={!file || busy} onClick={() => upload(false)}>Check file</button>
                <button className={btn} disabled={!file || busy || !sum || sum.committed} onClick={() => upload(true)}>Import</button>
            </div>
            {sum && (
                <div className="mt-3 rounded-lg bg-black/30 p-3 text-sm">
                    <p>{sum.committed ? `Imported ${sum.imported}.` : 'Check only, nothing saved.'} Rows {sum.rows}, new contacts {sum.accepted}, held for review {sum.held}.</p>
                    <p className="text-white/60">Skipped: {Object.entries(sum.skipped).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ')}. Hooks: {Object.entries(sum.hooks).map(([k, v]) => `${k} ${v}`).join(', ')}.</p>
                    {sum.sample.map((x) => (<details key={x.email} className="mt-2"><summary className="cursor-pointer">{x.email} ({x.hook}) {x.subject}</summary><pre className="mt-1 whitespace-pre-wrap text-xs text-white/70">{x.body}</pre></details>))}
                </div>
            )}

            <h3 className="mt-6 font-medium">2. Sending domains and pace</h3>
            <table className="mt-2 w-full text-left text-sm">
                <thead><tr className="text-white/60"><th className="py-1 pr-3">Domain</th><th className="pr-3">Resend</th><th className="pr-3">Today</th><th className="pr-3">14 days</th><th>State</th></tr></thead>
                <tbody>{st.domains.map((d) => (
                    <tr key={d.domain} className="border-t border-white/10">
                        <td className="py-1 pr-3 font-medium">{d.domain}</td><td className="pr-3">{d.verified ? 'verified' : 'not verified'}</td>
                        <td className="pr-3">{d.sentToday} of {d.budget}</td><td className="pr-3">{d.sent14} sent, {d.bounced14} bounced, {d.complaints14} complaints</td>
                        <td>{d.paused ? (<>paused: {d.paused} <button className="underline" onClick={() => post({ action: 'resume_domain', domain: d.domain })}>resume</button></>) : d.verified ? 'ready' : 'waiting for DNS'}</td>
                    </tr>))}</tbody>
            </table>
            <div className="mt-3 flex flex-wrap items-end gap-3">
                {field('cx_domains', 'Domains (comma list)', 'w-72')}{field('cx_start', 'Day 1 per domain')}{field('cx_step', 'Added per day')}{field('cx_cap', 'Cap per domain')}{field('cx_total_cap', 'Cap per day, all')}
                {field('cx_reply_to', 'Reply-To (blank = default)', 'w-52')}
                <button className={btn2} disabled={busy} onClick={() => post({ action: 'settings', values: vals })}>Save</button>
                <button className={btn2} disabled={busy} onClick={() => post({ action: 'verify_domains' })}>Check DNS now</button>
            </div>

            <h3 className="mt-6 font-medium">3. Test the four emails</h3>
            <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="text-xs text-white/60">Send from<br /><select className={inp} value={testDom} onChange={(e) => setTestDom(e.target.value)}>{st.domains.filter((d) => d.verified).map((d) => <option key={d.domain}>{d.domain}</option>)}</select></label>
                <label className="text-xs text-white/60">To (authorized test address)<br /><input className={`${inp} w-64`} value={testTo} onChange={(e) => setTestTo(e.target.value)} /></label>
                <button className={btn2} disabled={busy || !testDom} onClick={() => post({ action: 'test', domain: testDom, to: testTo })}>Send all four</button>
            </div>

            <h3 className="mt-6 font-medium">4. Look at one contact</h3>
            <div className="mt-2 flex gap-3"><input className={`${inp} w-72`} placeholder="email address" value={prevEmail} onChange={(e) => setPrevEmail(e.target.value)} /><button className={btn2} onClick={preview}>Show emails</button></div>
            {prev && (<div className="mt-3 space-y-2 text-sm"><p className="text-white/70">{String(prev.contact.email)} | {String(prev.contact.firm)} | status {String(prev.contact.status)} | hook {String(prev.contact.hook)}{prev.contact.hold ? ` | HELD: ${String(prev.contact.hold_reason)}` : ''} | sent: {prev.sends.map((s) => `E${s.step - 40} ${s.domain} ${s.status}`).join(', ') || 'none'}</p>
                {prev.emails.map((e) => (<details key={e.step}><summary className="cursor-pointer">Email {e.step}: {e.subject}</summary><pre className="mt-1 whitespace-pre-wrap rounded bg-black/30 p-3 text-xs text-white/80">{e.text}</pre></details>))}</div>)}

            <h3 className="mt-6 font-medium">5. Stop people who replied</h3>
            <div className="mt-2 flex gap-3"><textarea className={`${inp} h-16 w-96`} placeholder="Paste email addresses" value={stopList} onChange={(e) => setStopList(e.target.value)} /><button className={btn2} disabled={busy || !stopList.trim()} onClick={() => post({ action: 'stop', emails: stopList }).then(() => setStopList(''))}>Stop sequence</button></div>

            <h3 className="mt-6 font-medium">Results</h3>
            <p className="mt-1 text-sm text-white/70">Contacts: {st.contacts.map((c) => `${c.status} ${c.n}`).join(', ') || 'none'}. Hooks: {st.hooks.map((h) => `${h.hook_id} ${h.n}`).join(', ') || 'none'}.</p>
            <p className="text-sm text-white/70">Sent: {st.steps.map((x) => `E${x.step - 40} ${x.sent} (${x.delivered} delivered, ${x.bounced} bounced, ${x.complaints} complaints)`).join(' | ') || 'nothing yet'}.</p>
            {msg && <p className="mt-3 break-all text-xs text-white/60">{msg}</p>}
        </section>
    );
}
